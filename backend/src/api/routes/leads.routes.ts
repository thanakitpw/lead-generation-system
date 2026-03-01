import { Router, Response } from 'express'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'
import { generateDraftForLead } from '../../services/email-draft-generator.service'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { campaign_id, status, page = '1', limit = '50', email_verified } = req.query as Record<string, string>

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    const where: Record<string, unknown> = {}

    if (campaign_id) {
      where.campaignLeads = { some: { campaignId: campaign_id } }
    }
    if (status) {
      where.status = status.toUpperCase()
    }
    if (email_verified !== undefined) {
      where.emailVerified = email_verified === 'true'
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          campaignLeads: {
            where: campaign_id ? { campaignId: campaign_id } : undefined,
            select: { status: true, lastSentAt: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ])

    return res.json({
      data: leads,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

router.post('/select', async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds, campaignId } = req.body as { leadIds: string[]; campaignId: string }
    if (!Array.isArray(leadIds) || leadIds.length === 0 || !campaignId) {
      return res.status(400).json({ error: 'leadIds and campaignId are required' })
    }
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        email: { not: null },
        campaignLeads: { some: { campaignId } },
      },
      data: { status: 'SELECTED' },
    })

    // Fire-and-forget: generate email drafts for each selected lead
    for (const leadId of leadIds) {
      generateDraftForLead(leadId, campaignId).catch(() => {})
    }

    return res.json({ selected: result.count })
  } catch {
    return res.status(500).json({ error: 'Failed to select leads' })
  }
})

router.post('/bulk-delete', async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds } = req.body as { leadIds: string[] }
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds is required' })
    }
    await prisma.emailEvent.deleteMany({ where: { campaignLead: { leadId: { in: leadIds } } } })
    await prisma.emailDraft.deleteMany({ where: { campaignLead: { leadId: { in: leadIds } } } })
    await prisma.campaignLead.deleteMany({ where: { leadId: { in: leadIds } } })
    const result = await prisma.lead.deleteMany({ where: { id: { in: leadIds } } })
    return res.json({ deleted: result.count })
  } catch (err) {
    console.error('[bulk-delete]', err)
    return res.status(500).json({ error: 'Failed to bulk delete leads' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const lead = await prisma.lead.findUnique({ where: { id } })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })

    await prisma.emailEvent.deleteMany({ where: { campaignLead: { leadId: id } } })
    await prisma.emailDraft.deleteMany({ where: { campaignLead: { leadId: id } } })
    await prisma.campaignLead.deleteMany({ where: { leadId: id } })
    await prisma.lead.delete({ where: { id } })
    return res.json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'Failed to delete lead' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaignLeads: {
          include: {
            campaign: { select: { id: true, name: true, status: true } },
            emailDrafts: {
              include: { emailEvents: { orderBy: { occurredAt: 'desc' } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    })
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    return res.json(lead)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch lead' })
  }
})

export default router
