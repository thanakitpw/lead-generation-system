const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place'

// Non-human/automated email prefixes to filter out (keep info@, contact@, sales@ — valid B2B)
const SPAM_PREFIXES = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  'admin', 'webmaster', 'hostmaster', 'postmaster',
  'your', 'name', 'test', 'user', 'email', 'example',
  'privacy', 'legal', 'abuse', 'bounce', 'mailer-daemon',
]

export interface PlaceResult {
  placeId: string
  companyName: string
  address: string
  rating: number | null
  totalRatings: number
  businessStatus: string
  types: string
  website: string | null
  phone: string | null
  email: string | null
}

// Text Search — returns up to 2 pages (max 40 results per keyword)
async function textSearch(query: string, apiKey: string, pageToken?: string): Promise<any> {
  const params = new URLSearchParams({ key: apiKey, language: 'th' })
  if (pageToken) {
    params.set('pagetoken', pageToken)
  } else {
    params.set('query', query)
  }
  const res = await fetch(`${PLACES_BASE}/textsearch/json?${params}`)
  return res.json()
}

// Place Details — get website + phone
async function getPlaceDetails(placeId: string, apiKey: string): Promise<{ website: string | null; phone: string | null }> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'website,formatted_phone_number,international_phone_number',
    key: apiKey,
    language: 'th',
  })
  const res = await fetch(`${PLACES_BASE}/details/json?${params}`)
  const json = await res.json() as any
  const detail = json.result ?? {}
  return {
    website: detail.website || null,
    phone: detail.formatted_phone_number || detail.international_phone_number || null,
  }
}

// Crawl website homepage and extract the first valid business email
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

    // Extract all email-like patterns from HTML
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
    const allEmails = [...new Set(html.match(emailRegex) ?? [])]

    for (const email of allEmails) {
      const lower = email.toLowerCase()
      // Skip image/asset paths that look like emails (e.g. icon@2x.png)
      if (lower.includes('.png') || lower.includes('.jpg') || lower.includes('.svg') || lower.includes('.gif')) continue
      // Skip spam/generic prefixes
      const prefix = lower.split('@')[0]
      if (SPAM_PREFIXES.some((sp) => prefix === sp || prefix.startsWith(sp + '.'))) continue
      return email.toLowerCase()
    }

    return null
  } catch {
    return null
  }
}

// Sleep helper (Google requires 2s before next_page_token is valid)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Main function: search all keywords, deduplicate, enrich with details
export async function searchAndEnrichPlaces(
  keywords: string[],
  location: string,
  maxResults: number,
  apiKey: string,
  onPlace?: (place: PlaceResult) => Promise<void>, // callback per place (for streaming saves)
): Promise<PlaceResult[]> {
  const seen = new Set<string>()
  const results: PlaceResult[] = []

  for (const keyword of keywords) {
    if (results.length >= maxResults) break

    const query = `${keyword} ${location}`
    let pageToken: string | undefined

    // Up to 2 pages per keyword
    for (let page = 0; page < 2; page++) {
      if (results.length >= maxResults) break

      // Google requires a 2s delay before using next_page_token
      if (page > 0 && pageToken) await sleep(2000)

      let searchResult: any
      try {
        searchResult = await textSearch(query, apiKey, page > 0 ? pageToken : undefined)
      } catch {
        break
      }

      if (searchResult.status !== 'OK' && searchResult.status !== 'ZERO_RESULTS') break
      if (!searchResult.results?.length) break

      for (const place of searchResult.results) {
        if (results.length >= maxResults) break
        if (seen.has(place.place_id)) continue
        seen.add(place.place_id)

        // Get details (website + phone)
        let details = { website: null as string | null, phone: null as string | null }
        try {
          details = await getPlaceDetails(place.place_id, apiKey)
        } catch {
          // ignore — continue without details
        }

        // Extract email from website (best-effort, non-blocking)
        let email: string | null = null
        if (details.website) {
          email = await extractEmailFromWebsite(details.website)
        }

        const enriched: PlaceResult = {
          placeId: place.place_id,
          companyName: place.name,
          address: place.formatted_address || '',
          rating: place.rating ?? null,
          totalRatings: place.user_ratings_total ?? 0,
          businessStatus: place.business_status || 'OPERATIONAL',
          types: (place.types ?? []).join(','),
          website: details.website,
          phone: details.phone,
          email,
        }

        results.push(enriched)

        // Stream callback — lets caller save to DB as each place comes in
        if (onPlace) {
          await onPlace(enriched).catch(() => {})
        }
      }

      pageToken = searchResult.next_page_token
      if (!pageToken) break
    }
  }

  return results
}
