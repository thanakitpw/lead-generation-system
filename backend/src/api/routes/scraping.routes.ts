import { Router, Response } from 'express'
import { z } from 'zod'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

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

    const n8nUrl = process.env.N8N_WEBHOOK_URL
    if (n8nUrl) {
      axios.post(`${n8nUrl}/scraping-start`, {
        jobId: job.id,
        campaignId: data.campaignId,
        keywords: data.keywords,
        location: data.location,
        maxResults: data.maxResults,
      }, {
        headers: { 'x-api-key': process.env.N8N_API_KEY },
      }).catch((err) => console.error('n8n trigger failed:', err.message))
    }

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
