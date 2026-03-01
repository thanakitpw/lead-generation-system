import prisma from '../lib/prisma'

const SPAM_PREFIXES = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'support', 'help', 'hello', 'hi',
  'admin', 'webmaster', 'hostmaster', 'postmaster',
  'info', 'contact', 'sales', 'service', 'marketing',
  'your', 'name', 'test', 'user', 'email', 'example',
  'privacy', 'legal', 'abuse',
]

async function extractEmailFromWebsite(website: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(website, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadGenBot/1.0)' },
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const html = await res.text()

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    const allEmails = [...new Set(html.match(emailRegex) ?? [])]

    for (const email of allEmails) {
      const lower = email.toLowerCase()
      if (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.svg') || lower.includes('.gif')) continue
      const prefix = lower.split('@')[0]
      if (SPAM_PREFIXES.some((sp) => prefix === sp || prefix.startsWith(sp + '.'))) continue
      return email.toLowerCase()
    }

    return null
  } catch {
    return null
  }
}

// Enrich leads in a campaign that have a website but no email
export async function extractEmailsForCampaign(campaignId: string): Promise<{ enriched: number; total: number }> {
  const campaignLeads = await prisma.campaignLead.findMany({
    where: { campaignId },
    include: { lead: { select: { id: true, email: true, website: true } } },
  })

  const toEnrich = campaignLeads.filter((cl) => cl.lead.website && !cl.lead.email)
  let enriched = 0

  for (const cl of toEnrich) {
    const email = await extractEmailFromWebsite(cl.lead.website!)
    if (email) {
      await prisma.lead.update({
        where: { id: cl.lead.id },
        data: { email, emailVerified: false },
      }).catch(() => {})
      enriched++
    }
  }

  console.log(`[enrich-emails] campaign ${campaignId}: ${enriched}/${toEnrich.length} leads enriched`)
  return { enriched, total: toEnrich.length }
}
