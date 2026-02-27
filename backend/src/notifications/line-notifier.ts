import axios from 'axios'

export async function sendLineNotify(message: string, token?: string): Promise<void> {
  const notifyToken = token || process.env.LINE_NOTIFY_TOKEN
  if (!notifyToken) return

  await axios.post(
    'https://notify-api.line.me/api/notify',
    new URLSearchParams({ message }),
    { headers: { Authorization: `Bearer ${notifyToken}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  )
}

export async function notifyNewReply(companyName: string, email: string, appUrl: string, leadId: string, token?: string): Promise<void> {
  const message = `\n📧 มีคนตอบอีเมล!\n\nบริษัท: ${companyName}\nจาก: ${email}\n\n🔗 ดูรายละเอียด: ${appUrl}/leads/${leadId}`
  await sendLineNotify(message, token)
}

export async function notifyLowConfidenceDraft(companyName: string, confidence: number, subject: string, draftId: string, appUrl: string, token?: string): Promise<void> {
  const message = `\n⚠️ AI Draft รอ Review\n\nบริษัท: ${companyName}\nConfidence: ${Math.round(confidence * 100)}%\nหัวข้อ: ${subject}\n\n🔗 Review: ${appUrl}/drafts/${draftId}`
  await sendLineNotify(message, token)
}

export async function notifyScrapingComplete(totalFound: number, totalEmails: number, campaignName: string, token?: string): Promise<void> {
  const message = `\n✅ Scraping เสร็จแล้ว!\n\nแคมเปญ: ${campaignName}\nพบบริษัท: ${totalFound} แห่ง\nพบอีเมล: ${totalEmails} รายการ`
  await sendLineNotify(message, token)
}
