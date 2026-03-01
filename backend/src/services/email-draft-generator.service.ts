import prisma from '../lib/prisma'
import { generateEmail } from '../ai/email-generator'

export async function generateDraftForLead(leadId: string, campaignId: string): Promise<void> {
  try {
    const campaignLead = await prisma.campaignLead.findUnique({
      where: { campaignId_leadId: { campaignId, leadId } },
      include: {
        lead: true,
        campaign: true,
      },
    })

    if (!campaignLead || !campaignLead.lead.email) return

    // Skip if a non-rejected draft already exists
    const existing = await prisma.emailDraft.findFirst({
      where: { campaignLeadId: campaignLead.id, status: { not: 'REJECTED' } },
    })
    if (existing) return

    const generated = await generateEmail(campaignLead.lead as any, campaignLead.campaign as any)

    const threshold = Number(campaignLead.campaign.confidenceThreshold)
    const status = generated.confidence >= threshold ? 'APPROVED' : 'PENDING_REVIEW'

    await prisma.emailDraft.create({
      data: {
        campaignLeadId: campaignLead.id,
        subject: generated.subject,
        bodyHtml: generated.bodyHtml,
        bodyText: generated.bodyText,
        aiModel: campaignLead.campaign.aiModel,
        aiConfidence: generated.confidence,
        aiTokensUsed: generated.tokensUsed,
        aiCostUsd: generated.costUsd,
        aiReasoning: generated.reasoning,
        status: status as never,
      },
    })
  } catch (err) {
    console.error('[generateDraftForLead] error:', err)
  }
}
