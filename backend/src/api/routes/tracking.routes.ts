import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'

const router = Router()

const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

router.get('/open/:draftId', async (req: Request, res: Response) => {
  try {
    const draftId = req.params.draftId as string
    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } })

    if (draft) {
      await prisma.emailEvent.create({
        data: {
          emailDraftId: draftId,
          campaignLeadId: draft.campaignLeadId,
          eventType: 'OPENED',
          eventData: { ip: req.ip, userAgent: req.headers['user-agent'] },
        },
      })

      await prisma.campaignLead.update({
        where: { id: draft.campaignLeadId },
        data: { status: 'OPENED' },
      })
    }
  } catch (err) {
    console.error('Tracking open error:', err)
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRACKING_PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  })
  return res.send(TRACKING_PIXEL)
})

router.get('/click/:draftId', async (req: Request, res: Response) => {
  try {
    const draftId = req.params.draftId as string
    const { url } = req.query as { url?: string }
    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } })

    if (draft) {
      await prisma.emailEvent.create({
        data: {
          emailDraftId: draftId,
          campaignLeadId: draft.campaignLeadId,
          eventType: 'CLICKED',
          eventData: { url, ip: req.ip, userAgent: req.headers['user-agent'] },
        },
      })

      await prisma.campaignLead.update({
        where: { id: draft.campaignLeadId },
        data: { status: 'CLICKED' },
      })
    }

    if (url) return res.redirect(decodeURIComponent(url))
    return res.status(200).send('Click tracked')
  } catch (err) {
    console.error('Tracking click error:', err)
    return res.status(500).send('Error')
  }
})

router.get('/unsubscribe/:draftId', async (req: Request, res: Response) => {
  try {
    const draftId = req.params.draftId as string
    const draft = await prisma.emailDraft.findUnique({
      where: { id: draftId },
      include: { campaignLead: { include: { lead: true } } },
    })

    if (!draft || !(draft as any).campaignLead?.lead?.email) {
      return res.status(400).send('Invalid unsubscribe link')
    }

    const email = (draft as any).campaignLead.lead.email as string

    await prisma.unsubscribe.upsert({
      where: { email },
      update: {},
      create: { email, reason: 'User clicked unsubscribe link' },
    })

    await prisma.campaignLead.update({
      where: { id: draft.campaignLeadId },
      data: { status: 'UNSUBSCRIBED' },
    })

    await prisma.lead.update({
      where: { id: (draft as any).campaignLead.leadId },
      data: { status: 'UNSUBSCRIBED' },
    })

    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>ยกเลิกการรับอีเมลสำเร็จ</h2>
        <p>อีเมล <strong>${email}</strong> ถูกนำออกจากรายชื่อส่งอีเมลแล้ว</p>
      </body></html>
    `)
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return res.status(500).send('Error processing unsubscribe')
  }
})

export default router
