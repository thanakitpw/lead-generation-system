import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'
import { runScrapingJob } from '../../services/scraping-runner.service'

const router = Router()
router.use(authMiddleware)

const startScrapingSchema = z.object({
  campaignId: z.string().uuid(),
  keywords: z.array(z.string()).min(1),
  location: z.string().min(1),
  industry: z.string().optional(),
  maxResults: z.number().int().min(1).max(200).default(100),
})

router.post('/start', async (req: AuthRequest, res: Response) => {
  try {
    const data = startScrapingSchema.parse(req.body)

    const campaign = await prisma.campaign.findFirst({
      where: { id: data.campaignId, createdBy: req.userId! },
    })
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })

    const job = await prisma.scrapingJob.create({
      data: {
        campaignId: data.campaignId,
        keywords: data.keywords,
        location: data.location,
        industry: data.industry,
        maxResults: data.maxResults,
        status: 'PENDING',
      },
    })

    // Run scraping in background — don't await (fire & forget)
    runScrapingJob(job.id, data.campaignId, {
      keywords: data.keywords,
      location: data.location,
      maxResults: data.maxResults,
    }).catch((err) => console.error('[scraping] runner error:', err.message))

    return res.status(201).json({ jobId: job.id, status: job.status })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: err.errors })
    return res.status(500).json({ error: 'Failed to start scraping job' })
  }
})

router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.scrapingJob.findMany({
      where: { campaign: { createdBy: req.userId! } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return res.json(jobs)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch scraping jobs' })
  }
})

router.get('/jobs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string
    const job = await prisma.scrapingJob.findFirst({
      where: { id, campaign: { createdBy: req.userId! } },
    })
    if (!job) return res.status(404).json({ error: 'Job not found' })
    return res.json(job)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch scraping job' })
  }
})

export default router
