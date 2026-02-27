import { Router, Response } from 'express'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

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
