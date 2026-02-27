import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  targetIndustry: z.string().optional(),
  targetLocation: z.string().optional(),
  targetKeywords: z.array(z.string()).default([]),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
  replyToEmail: z.string().email().optional(),
  confidenceThreshold: z.number().min(0).max(1).default(0.75),
  systemPrompt: z.string().optional(),
  dailySendLimit: z.number().int().min(1).max(200).default(50),
})

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { createdBy: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { campaignLeads: true, scrapingJobs: true } },
      },
    })
    return res.json(campaigns)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createCampaignSchema.parse(req.body)
    const campaign = await prisma.campaign.create({
      data: { ...data, createdBy: req.userId! },
    })
    return res.status(201).json(campaign)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: err.errors })
    return res.status(500).json({ error: 'Failed to create campaign' })
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const campaign = await prisma.campaign.findFirst({
      where: { id, createdBy: req.userId! },
      include: {
        _count: { select: { campaignLeads: true } },
        scrapingJobs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    return res.json(campaign)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch campaign' })
  }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const campaign = await prisma.campaign.findFirst({ where: { id, createdBy: req.userId! } })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const data = createCampaignSchema.partial().parse(req.body)
    const updated = await prisma.campaign.update({ where: { id }, data })
    return res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: err.errors })
    return res.status(500).json({ error: 'Failed to update campaign' })
  }
})

router.put('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const campaign = await prisma.campaign.findFirst({ where: { id, createdBy: req.userId! } })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })
    return res.json(updated)
  } catch {
    return res.status(500).json({ error: 'Failed to start campaign' })
  }
})

router.put('/:id/pause', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const campaign = await prisma.campaign.findFirst({ where: { id, createdBy: req.userId! } })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    })
    return res.json(updated)
  } catch {
    return res.status(500).json({ error: 'Failed to pause campaign' })
  }
})

export default router
