import { Router, Response } from 'express'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

router.get('/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const [totalLeads, totalEmailsSent, totalOpened, totalReplied, pendingReviewCount, apiCostThisMonth] =
      await Promise.all([
        prisma.lead.count(),
        prisma.emailDraft.count({ where: { status: 'SENT' } }),
        prisma.emailEvent.count({ where: { eventType: 'OPENED' } }),
        prisma.emailEvent.count({ where: { eventType: 'REPLIED' } }),
        prisma.emailDraft.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.apiUsageLog.aggregate({
          _sum: { costUsd: true },
          where: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ])

    const openRate = totalEmailsSent > 0 ? (totalOpened / totalEmailsSent) * 100 : 0
    const replyRate = totalEmailsSent > 0 ? (totalReplied / totalEmailsSent) * 100 : 0
    const costUsd = Number(apiCostThisMonth._sum.costUsd || 0)
    const costThb = costUsd * 35

    const recentActivity = await prisma.emailEvent.findMany({
      take: 10,
      orderBy: { occurredAt: 'desc' },
      include: {
        draft: {
          include: {
            campaignLead: {
              include: { lead: { select: { companyName: true } } },
            },
          },
        },
      },
    })

    return res.json({
      totalLeads,
      totalEmailsSent,
      openRate: Math.round(openRate * 10) / 10,
      replyRate: Math.round(replyRate * 10) / 10,
      pendingReviewCount,
      apiCostThb: Math.round(costThb * 100) / 100,
      apiCostUsd: Math.round(costUsd * 1000) / 1000,
      recentActivity,
    })
  } catch (err) {
    console.error('Analytics overview error:', err)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

router.get('/campaigns/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const campaign = await prisma.campaign.findFirst({
      where: { id, createdBy: req.userId! },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const [totalLeads, sent, opened, clicked, replied] = await Promise.all([
      prisma.campaignLead.count({ where: { campaignId: id } }),
      prisma.campaignLead.count({ where: { campaignId: id, status: { in: ['SENT', 'OPENED', 'CLICKED', 'REPLIED', 'CONVERTED'] } } }),
      prisma.campaignLead.count({ where: { campaignId: id, status: { in: ['OPENED', 'CLICKED', 'REPLIED', 'CONVERTED'] } } }),
      prisma.campaignLead.count({ where: { campaignId: id, status: { in: ['CLICKED', 'REPLIED', 'CONVERTED'] } } }),
      prisma.campaignLead.count({ where: { campaignId: id, status: { in: ['REPLIED', 'CONVERTED'] } } }),
    ])

    return res.json({
      campaign,
      metrics: {
        totalLeads,
        sent,
        opened,
        clicked,
        replied,
        openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
      },
    })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch campaign analytics' })
  }
})

export default router
