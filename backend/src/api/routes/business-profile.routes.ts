import { Router, Response } from 'express'
import prisma from '../../lib/prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware'

const router = Router()
router.use(authMiddleware)

// GET /api/business-profile — get current user's profile
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await (prisma as any).businessProfile.findFirst({
      where: { userId: req.userId },
    })
    return res.json(profile ?? null)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch business profile' })
  }
})

// PUT /api/business-profile — create or update profile
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName, companyWebsite, facebookPage, companyDescription,
      productsServices, valueProposition,
      targetIndustries, targetCustomerSize, targetDescription,
    } = req.body

    if (!companyName) return res.status(400).json({ error: 'companyName is required' })

    const existing = await (prisma as any).businessProfile.findFirst({ where: { userId: req.userId } })

    const data = {
      companyName,
      companyWebsite: companyWebsite || null,
      facebookPage: facebookPage || null,
      companyDescription: companyDescription || null,
      productsServices: productsServices || null,
      valueProposition: valueProposition || null,
      targetIndustries: Array.isArray(targetIndustries) ? targetIndustries : [],
      targetCustomerSize: targetCustomerSize || null,
      targetDescription: targetDescription || null,
    }

    const profile = existing
      ? await (prisma as any).businessProfile.update({ where: { id: existing.id }, data })
      : await (prisma as any).businessProfile.create({ data: { ...data, userId: req.userId } })

    return res.json(profile)
  } catch {
    return res.status(500).json({ error: 'Failed to save business profile' })
  }
})

// POST /api/business-profile/extract — AI extract from URL
router.post('/extract', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body as { url: string }
    if (!url) return res.status(400).json({ error: 'url is required' })

    // Fetch page content
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    let html = ''
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadGenBot/1.0)' },
      })
      html = await response.text()
    } finally {
      clearTimeout(timeout)
    }

    // Strip HTML tags, collapse whitespace, limit length
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)

    // Call OpenRouter (Claude Haiku)
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: `สกัดข้อมูลธุรกิจจากเนื้อหาเว็บไซต์นี้ และตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น (ไม่ต้องมี markdown) ให้ข้อมูลทุกฟิลด์เป็นภาษาไทย:
{
  "companyName": "ชื่อบริษัท",
  "companyDescription": "อธิบายธุรกิจ 1-2 ประโยคว่าทำอะไร",
  "productsServices": "รายการสินค้าหรือบริการหลัก",
  "valueProposition": "จุดแข็งหรือสิ่งที่ทำให้โดดเด่น",
  "targetIndustries": ["อุตสาหกรรม1", "อุตสาหกรรม2"],
  "targetCustomerSize": "SME | Enterprise | ทุกขนาด",
  "targetDescription": "กลุ่มลูกค้าเป้าหมายคือใคร"
}

เนื้อหาเว็บไซต์:
${text}`,
          },
        ],
        temperature: 0.2,
      }),
    })

    const aiJson = await aiRes.json() as any
    const content = aiJson.choices?.[0]?.message?.content ?? ''

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(422).json({ error: 'AI could not extract info from this URL' })

    const extracted = JSON.parse(jsonMatch[0])
    return res.json(extracted)
  } catch (err: any) {
    if (err?.name === 'AbortError') return res.status(408).json({ error: 'URL fetch timed out' })
    return res.status(500).json({ error: 'Failed to extract from URL' })
  }
})

export default router
