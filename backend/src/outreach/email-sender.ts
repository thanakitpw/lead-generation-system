import * as SibApiV3Sdk from 'sib-api-v3-sdk'
import prisma from '../lib/prisma'

const defaultClient = SibApiV3Sdk.ApiClient.instance
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.BREVO_API_KEY || ''

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

interface Lead {
  id: string
  email: string | null
  contactName: string | null
  companyName: string
}

interface Campaign {
  id: string
  senderName: string | null
  senderEmail: string | null
  replyToEmail: string | null
}

interface Draft {
  id: string
  subject: string
  bodyHtml: string
  bodyText: string | null
}

export async function sendEmail(draft: Draft, lead: Lead, campaign: Campaign): Promise<string> {
  if (!lead.email) throw new Error('Lead has no email address')

  const isUnsubscribed = await prisma.unsubscribe.findUnique({ where: { email: lead.email } })
  if (isUnsubscribed) throw new Error(`Email ${lead.email} is unsubscribed`)

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const trackingPixel = `<img src="${appUrl}/track/open/${draft.id}" width="1" height="1" style="display:none" />`
  const bodyWithTracking = addClickTracking(draft.bodyHtml, draft.id, appUrl) + trackingPixel

  const unsubscribeUrl = `${appUrl}/track/unsubscribe/${draft.id}`

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
  sendSmtpEmail.sender = {
    name: campaign.senderName || process.env.BREVO_SENDER_NAME || 'LeadGen',
    email: campaign.senderEmail || process.env.BREVO_SENDER_EMAIL || 'noreply@example.com',
  }
  sendSmtpEmail.to = [{ email: lead.email, name: lead.contactName || lead.companyName }]

  if (campaign.replyToEmail) {
    sendSmtpEmail.replyTo = { email: campaign.replyToEmail }
  }

  sendSmtpEmail.subject = draft.subject
  sendSmtpEmail.htmlContent = bodyWithTracking
  sendSmtpEmail.textContent = draft.bodyText || undefined
  sendSmtpEmail.headers = {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'X-Campaign-Id': campaign.id,
    'X-Draft-Id': draft.id,
  }

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
  return (result as { messageId?: string }).messageId || ''
}

function addClickTracking(html: string, draftId: string, appUrl: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_match: string, url: string) =>
      `href="${appUrl}/track/click/${draftId}?url=${encodeURIComponent(url)}"`
  )
}
