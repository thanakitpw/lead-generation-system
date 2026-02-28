import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

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
    const { type, jobId, data, lead: leadData, campaignId } = req.body

    if (type === 'scraping_lead' && leadData?.companyName) {
      // Find or create lead by googleMapsPlaceId
      let lead = leadData.placeId
        ? await prisma.lead.findFirst({ where: { googleMapsPlaceId: leadData.placeId } })
        : null

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            companyName: leadData.companyName,
            address: leadData.address || null,
            website: leadData.website || null,
            phone: leadData.phone || null,
            googleMapsPlaceId: leadData.placeId || null,
            googleMapsRating: leadData.rating || null,
            googleMapsReviews: leadData.totalRatings || null,
            status: 'NEW',
          },
        })
      }

      // Link lead to campaign
      const cId = campaignId || (jobId ? (await prisma.scrapingJob.findUnique({ where: { id: jobId }, select: { campaignId: true } }))?.campaignId : null)
      if (cId) {
        await prisma.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId: cId, leadId: lead.id } },
          create: { campaignId: cId, leadId: lead.id },
          update: {},
        })
        await prisma.campaign.update({
          where: { id: cId },
          data: { statsTotalLeads: { increment: lead ? 0 : 1 } },
        }).catch(() => {})
      }

      if (jobId) {
        await prisma.scrapingJob.update({
          where: { id: jobId },
          data: { totalFound: { increment: 1 } },
        }).catch(() => {})
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
