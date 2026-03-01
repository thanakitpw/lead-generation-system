import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

// AI lead scoring — runs in background after lead is saved
async function scoreLeadWithAI(leadId: string, campaignId: string) {
  try {
    // Get lead and campaign's owner
    const [lead, campaign] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.campaign.findUnique({ where: { id: campaignId }, select: { createdBy: true } }),
    ])
    if (!lead || !campaign) return

    const profile = await (prisma as any).businessProfile.findFirst({ where: { userId: campaign.createdBy } })
    if (!profile) return // no profile → skip scoring

    const prompt = `You are a B2B sales analyst. Rate this lead from 0-100 on how well they match the seller's profile.

Seller profile:
- Company: ${profile.companyName}
- Products/Services: ${profile.productsServices ?? 'N/A'}
- Value Proposition: ${profile.valueProposition ?? 'N/A'}
- Target Industries: ${profile.targetIndustries.join(', ') || 'Any'}
- Target Customer Size: ${profile.targetCustomerSize ?? 'Any'}
- Target Description: ${profile.targetDescription ?? 'N/A'}

Lead:
- Company: ${lead.companyName}
- Industry: ${lead.industry ?? 'Unknown'}
- Address: ${lead.address ?? 'Unknown'}
- Has Website: ${lead.website ? 'Yes' : 'No'}
- Google Rating: ${lead.googleMapsRating ?? 'N/A'} (${lead.googleMapsReviews ?? 0} reviews)

Return ONLY valid JSON (no markdown):
{"score": 75, "tier": "HOT", "reason": "เหตุผลสั้นๆ 1-2 ประโยคภาษาไทย"}

Rules: tier = HOT if score 70-100, WARM if 40-69, COLD if 0-39`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? 'anthropic/claude-3-haiku',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    })

    const json = await res.json() as any
    const content = json.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return

    const { score, tier, reason } = JSON.parse(match[0])
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: typeof score === 'number' ? Math.min(100, Math.max(0, Math.round(score))) : null,
        aiTier: tier ?? null,
        aiReason: reason ?? null,
      } as any,
    })
  } catch (err) {
    console.error('[scoreLeadWithAI] error:', err)
  }
}

const brevoEventMap: Record<string, string> = {
  delivered: 'DELIVERED',
  opened: 'OPENED',
  clicked: 'CLICKED',
  spam: 'SPAM',
  unsubscribed: 'UNSUBSCRIBED',
  bounced: 'BOUNCED',
  hardBounce: 'BOUNCED',
  softBounce: 'BOUNCED',
}

router.post('/brevo', async (req: Request, res: Response) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body]

    for (const event of events) {
      const { event: eventType, messageId, email } = event

      if (!messageId) continue

      const draft = await prisma.emailDraft.findFirst({
        where: { brevoMessageId: messageId },
      })

      if (!draft) continue

      const mappedType = brevoEventMap[eventType]
      if (!mappedType) continue

      await prisma.emailEvent.create({
        data: {
          emailDraftId: draft.id,
          campaignLeadId: draft.campaignLeadId,
          eventType: mappedType as never,
          eventData: event,
        },
      })

      const statusMap: Record<string, string> = {
        OPENED: 'OPENED',
        CLICKED: 'CLICKED',
        BOUNCED: 'BOUNCED',
        SPAM: 'BOUNCED',
        UNSUBSCRIBED: 'UNSUBSCRIBED',
      }

      if (statusMap[mappedType]) {
        await prisma.campaignLead.update({
          where: { id: draft.campaignLeadId },
          data: { status: statusMap[mappedType] as never },
        })

        if (mappedType === 'OPENED') {
          const campaignLead = await prisma.campaignLead.findUnique({ where: { id: draft.campaignLeadId } })
          if (campaignLead) {
            await prisma.campaign.update({
              where: { id: campaignLead.campaignId },
              data: { statsEmailsOpened: { increment: 1 } },
            })
          }
        }
      }

      if (eventType === 'unsubscribed' && email) {
        await prisma.unsubscribe.upsert({
          where: { email },
          update: {},
          create: { email, reason: 'Unsubscribed via email link' },
        })
      }
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('Brevo webhook error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
})

router.post('/n8n', async (req: Request, res: Response) => {
  try {
    const body = req.body
    const type = body.type
    const jobId = body.jobId
    const data = body.data
    const campaignId = body.campaignId

    // Support both nested lead object and flat structure (from n8n bodyParameters)
    const leadData = body.lead || (body.companyName ? body : null)

    if (type === 'scraping_lead' && leadData?.companyName) {
      const placeId = leadData.placeId || null
      // Find or create lead by googleMapsPlaceId
      let lead = placeId
        ? await prisma.lead.findFirst({ where: { googleMapsPlaceId: placeId } })
        : null

      const isNewLead = !lead

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            companyName: leadData.companyName,
            address: leadData.address || null,
            website: leadData.website || null,
            phone: leadData.phone || null,
            email: leadData.email || null,
            emailVerified: false,
            industry: leadData.types ? String(leadData.types).split(',')[0] : null,
            googleMapsPlaceId: placeId,
            googleMapsRating: leadData.rating ? Number(leadData.rating) : null,
            googleMapsReviews: leadData.totalRatings ? Number(leadData.totalRatings) : null,
            status: 'NEW',
          },
        })
      } else if (leadData.email && !lead.email) {
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: { email: leadData.email, emailVerified: false },
        })
      }

      // Link lead to campaign
      const cId = campaignId || (jobId ? (await prisma.scrapingJob.findUnique({ where: { id: jobId }, select: { campaignId: true } }))?.campaignId : null)
      if (cId) {
        await prisma.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId: cId, leadId: lead.id } },
          create: { campaignId: cId, leadId: lead.id },
          update: {},
        }).catch(() => {})
        await prisma.campaign.update({
          where: { id: cId },
          data: { statsTotalLeads: { increment: isNewLead ? 1 : 0 } },
        }).catch(() => {})
      }

      if (jobId) {
        // Transition PENDING → RUNNING on first lead received
        await prisma.scrapingJob.updateMany({
          where: { id: jobId, status: 'PENDING' },
          data: { status: 'RUNNING', startedAt: new Date() },
        }).catch(() => {})
        await prisma.scrapingJob.update({
          where: { id: jobId },
          data: { totalFound: { increment: 1 } },
        }).catch(() => {})
      }

      // AI scoring — fire and forget (don't block webhook response)
      if (cId) {
        scoreLeadWithAI(lead.id, cId).catch(() => {})
      }
    }

    if (type === 'scraping_complete' && jobId) {
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalFound: data?.totalFound || 0,
          totalEmailsFound: data?.totalEmailsFound || 0,
          results: data?.results || null,
        },
      })
    }

    if (type === 'scraping_failed' && jobId) {
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: data?.error || 'Unknown error', completedAt: new Date() },
      })
    }

    if (type === 'reply_detected' && data?.email) {
      const lead = await prisma.lead.findFirst({ where: { email: data.email } })
      if (lead) {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: 'REPLIED' } })
      }
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('n8n webhook error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router
