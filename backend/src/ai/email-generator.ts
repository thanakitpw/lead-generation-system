import Anthropic from '@anthropic-ai/sdk'
import prisma from '../lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const response = await anthropic.messages.create({
    model: campaign.aiModel || 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const totalTokens = inputTokens + outputTokens
  const costUsd = (inputTokens * 0.000003) + (outputTokens * 0.000015)

  await prisma.apiUsageLog.create({
    data: {
      service: 'claude',
      tokensUsed: totalTokens,
      costUsd: costUsd,
      requestType: 'email_generation',
    },
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  let parsed: {
    subject: string
    body_html: string
    body_text: string
    confidence: number
    reasoning: string
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error(`Failed to parse Claude response: ${content.text.substring(0, 200)}`)
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
