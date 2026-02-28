import prisma from '../lib/prisma'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'anthropic/claude-3-haiku'

export interface EmailGenerationResult {
  subject: string
  bodyHtml: string
  bodyText: string
  confidence: number
  reasoning: string
  tokensUsed: number
  costUsd: number
}

interface Lead {
  id: string
  companyName: string
  contactName: string | null
  contactTitle: string | null
  email: string | null
  website: string | null
  industry: string | null
  companyDescription: string | null
}

interface Campaign {
  id: string
  senderName: string | null
  systemPrompt: string | null
  aiModel: string
}

export async function generateEmail(lead: Lead, campaign: Campaign): Promise<EmailGenerationResult> {
  const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านการเขียน B2B Cold Email ภาษาไทย

กฎสำคัญ:
1. เขียน email ที่ดูเป็นส่วนตัว ไม่ใช่ mass email
2. กล่าวถึงข้อมูลจริงของบริษัทผู้รับ (ชื่อ, ธุรกิจ)
3. Value proposition ชัดเจน ใน 1-2 ประโยค
4. ไม่เกิน 150 คำ
5. มี CTA ที่ชัดเจน 1 อย่าง (นัด demo / ขอคุย 15 นาที)
6. ไม่ขายตรง ไม่ aggressive
7. ลงท้ายด้วย: ${campaign.senderName || 'ทีมงาน'}

${campaign.systemPrompt ? `ข้อมูลเพิ่มเติมเกี่ยวกับสิ่งที่เราเสนอ:\n${campaign.systemPrompt}` : ''}

ตอบใน JSON format เท่านั้น (ไม่มี markdown):
{
  "subject": "หัวข้ออีเมล",
  "body_html": "เนื้อหา HTML (ใช้ <p>, <br> ได้)",
  "body_text": "เนื้อหา plain text",
  "confidence": 0.0-1.0,
  "reasoning": "เหตุผลที่ confidence ระดับนี้"
}`

  const userPrompt = `ข้อมูลบริษัทผู้รับ:
- ชื่อบริษัท: ${lead.companyName}
- ประเภทธุรกิจ: ${lead.industry || 'ไม่ระบุ'}
- รายละเอียดบริษัท: ${lead.companyDescription || 'ไม่มีข้อมูล'}
- เว็บไซต์: ${lead.website || 'ไม่มี'}
- ชื่อผู้รับ: ${lead.contactName || 'ทีมงาน'}
- ตำแหน่ง: ${lead.contactTitle || 'ไม่ระบุ'}

เขียน cold email ที่เหมาะสมสำหรับบริษัทนี้โดยเฉพาะ`

  const model = campaign.aiModel || DEFAULT_MODEL

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'LeadGen MVP',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${err}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  const inputTokens = data.usage?.prompt_tokens || 0
  const outputTokens = data.usage?.completion_tokens || 0
  const totalTokens = data.usage?.total_tokens || 0
  const costUsd = totalTokens * 0.000001

  await prisma.apiUsageLog.create({
    data: {
      service: 'openrouter',
      tokensUsed: totalTokens,
      costUsd,
      requestType: 'email_generation',
    },
  })

  const rawText = data.choices[0]?.message?.content || ''

  let parsed: {
    subject: string
    body_html: string
    body_text: string
    confidence: number
    reasoning: string
  }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error(`Failed to parse AI response: ${rawText.substring(0, 200)}`)
  }

  return {
    subject: parsed.subject,
    bodyHtml: parsed.body_html,
    bodyText: parsed.body_text,
    confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
    reasoning: parsed.reasoning || '',
    tokensUsed: totalTokens,
    costUsd,
  }
}
