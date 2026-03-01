import prisma from '../lib/prisma'
import { searchAndEnrichPlaces, PlaceResult } from './google-places.service'
import { scoreLeadWithAI } from './ai-scoring.service'

export interface ScrapingParams {
  keywords: string[]
  location: string
  maxResults: number
}

// Save one place as a Lead + link to campaign
async function saveLead(place: PlaceResult, jobId: string, campaignId: string): Promise<string | null> {
  try {
    // Upsert lead by placeId (or create new if no placeId)
    let lead = place.placeId
      ? await prisma.lead.findFirst({ where: { googleMapsPlaceId: place.placeId } })
      : null

    const isNewLead = !lead

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          companyName: place.companyName,
          address: place.address || null,
          website: place.website || null,
          phone: place.phone || null,
          industry: place.types ? place.types.split(',')[0] : null,
          googleMapsPlaceId: place.placeId || null,
          googleMapsRating: place.rating ?? null,
          googleMapsReviews: place.totalRatings ?? null,
          status: 'NEW',
          emailVerified: false,
        },
      })
    } else if (place.website && !lead.website) {
      // Enrich existing lead with newly found website/phone
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          website: place.website,
          phone: place.phone || lead.phone,
        },
      })
    }

    // Link lead to campaign (ignore if already linked)
    await prisma.campaignLead.upsert({
      where: { campaignId_leadId: { campaignId, leadId: lead.id } },
      create: { campaignId, leadId: lead.id },
      update: {},
    }).catch(() => {})

    // Increment campaign stats for new leads only
    if (isNewLead) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { statsTotalLeads: { increment: 1 } },
      }).catch(() => {})
    }

    // Increment job totalFound
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: { totalFound: { increment: 1 } },
    }).catch(() => {})

    return lead.id
  } catch (err) {
    console.error('[saveLead] error:', err)
    return null
  }
}

// Main runner — called async (fire & forget from route)
export async function runScrapingJob(jobId: string, campaignId: string, params: ScrapingParams): Promise<void> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: 'GOOGLE_MAPS_API_KEY not configured', completedAt: new Date() },
    }).catch(() => {})
    return
  }

  // PENDING → RUNNING
  await prisma.scrapingJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  }).catch(() => {})

  let totalFound = 0

  try {
    await searchAndEnrichPlaces(
      params.keywords,
      params.location,
      params.maxResults,
      apiKey,
      async (place: PlaceResult) => {
        const leadId = await saveLead(place, jobId, campaignId)
        if (leadId) {
          totalFound++
          // AI scoring — fire & forget, don't block scraping
          scoreLeadWithAI(leadId, campaignId).catch(() => {})
        }
      },
    )

    // RUNNING → COMPLETED
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', completedAt: new Date(), totalFound },
    }).catch(() => {})

    console.log(`[scraping] job ${jobId} completed — ${totalFound} leads found`)
  } catch (err: any) {
    console.error(`[scraping] job ${jobId} failed:`, err)
    await prisma.scrapingJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: err?.message || 'Unknown error', completedAt: new Date() },
    }).catch(() => {})
  }
}
