import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'
import { generateEmail } from '../../ai/email-generator'
import { sendEmail } from '../../outreach/email-sender'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'PENDING_REVIEW', page = '1', limit = '20' } = req.query as Record<string, string>
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    const drafts = await prisma.emailDraft.findMany({
      where: { status: status as never },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        campaignLead: {
          include: {
            lead: { select: { id: true, companyName: true, email: true, contactName: true } },
            campaign: { select: { id: true, name: true } },
          },
        },
      },
    })

    const total = await prisma.emailDraft.count({ where: { status: status as never } })

    return res.json({
      data: drafts,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch drafts' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: {
        campaignLead: {
          include: {
            lead: true,
            campaign: true,
          },
        },
        emailEvents: { orderBy: { occurredAt: 'desc' } },
      },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    return res.json(draft)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch draft' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const { subject, bodyHtml, bodyText } = req.body
    const draft = await prisma.emailDraft.findUnique({ where: { id } })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (draft.status === 'SENT') return res.status(400).json({ error: 'Cannot edit a sent draft' })

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: { subject, bodyHtml, bodyText },
    })
    return res.json(updated)
  } catch {
    return res.status(500).json({ error: 'Failed to update draft' })
  }
})

router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: { campaignLead: { include: { lead: true, campaign: true } } },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (draft.status !== 'PENDING_REVIEW') return res.status(400).json({ error: 'Draft is not pending review' })

    const messageId = await sendEmail(draft as any, draft.campaignLead.lead, draft.campaignLead.campaign)

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: {
        status: 'SENT',
        approvedBy: req.userId,
        approvedAt: new Date(),
        brevoMessageId: messageId,
        sentAt: new Date(),
      },
    })

    await prisma.campaignLead.update({
      where: { id: draft.campaignLeadId },
      data: { status: 'SENT', lastSentAt: new Date() },
    })

    await prisma.campaign.update({
      where: { id: draft.campaignLead.campaignId },
      data: { statsEmailsSent: { increment: 1 } },
    })

    return res.json({ message: 'Email sent successfully', draft: updated })
  } catch (err) {
    console.error('Approve error:', err)
    return res.status(500).json({ error: 'Failed to approve and send draft' })
  }
})

router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body)
    const draft = await prisma.emailDraft.findUnique({ where: { id } })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (draft.status !== 'PENDING_REVIEW') return res.status(400).json({ error: 'Draft is not pending review' })

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: reason },
    })
    return res.json(updated)
  } catch {
    return res.status(500).json({ error: 'Failed to reject draft' })
  }
})

router.post('/:id/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
      include: { campaignLead: { include: { lead: true, campaign: true } } },
    })
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    const generated = await generateEmail(draft.campaignLead.lead as any, draft.campaignLead.campaign as any)

    const updated = await prisma.emailDraft.update({
      where: { id },
      data: {
        subject: generated.subject,
        bodyHtml: generated.bodyHtml,
        bodyText: generated.bodyText,
        aiConfidence: generated.confidence,
        aiTokensUsed: generated.tokensUsed,
        aiCostUsd: generated.costUsd,
        aiReasoning: generated.reasoning,
        status: generated.confidence >= Number(draft.campaignLead.campaign.confidenceThreshold) ? 'APPROVED' : 'PENDING_REVIEW',
      },
    })
    return res.json(updated)
  } catch (err) {
    console.error('Regenerate error:', err)
    return res.status(500).json({ error: 'Failed to regenerate draft' })
  }
})

export default router
