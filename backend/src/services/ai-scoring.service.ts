import prisma from '../lib/prisma'

export async function scoreLeadWithAI(leadId: string, campaignId: string): Promise<void> {
  try {
    const [lead, campaign] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.campaign.findUnique({ where: { id: campaignId }, select: { createdBy: true } }),
    ])
    if (!lead || !campaign) return

    const profile = await (prisma as any).businessProfile.findFirst({ where: { userId: campaign.createdBy } })
    if (!profile) return

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
