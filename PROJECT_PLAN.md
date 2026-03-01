# LeadGen AI — Project Plan

> แผนพัฒนาตั้งแต่เริ่มต้นจนเปิดขาย

---

## Phase 1 — Core Infrastructure ✅

- [x] Backend API (Node.js + Express + Prisma + PostgreSQL)
- [x] Authentication (JWT + authMiddleware)
- [x] Campaign CRUD
- [x] Lead model (companyName, phone, email, website, rating, googleMapsPlaceId)
- [x] CampaignLead (lead ↔ campaign many-to-many)
- [x] Deploy Backend บน VPS (PM2 + port 3000)
- [x] Deploy Frontend บน Vercel (React + Vite)

---

## Phase 2 — Lead Scraping ✅

- [x] Google Maps scraping ผ่าน n8n workflow (v1)
- [x] ย้ายมาทำบน Native Node.js (ไม่พึ่ง n8n แล้ว)
  - [x] `google-places.service.ts` — Text Search API + Place Details API
  - [x] `scraping-runner.service.ts` — จัดการ job lifecycle (PENDING → RUNNING → COMPLETED)
  - [x] Deduplication by `googleMapsPlaceId`
  - [x] Streaming callback (save lead ทีละตัวแบบ real-time)
- [x] Email extraction จากเว็บไซต์ (regex + spam filter)
- [x] ScrapingJob status tracking + polling บน Frontend
- [x] Fix bugs: `statsTotalLeads` counter, RUNNING transition, polling stop condition

---

## Phase 3 — AI Lead Scoring ✅

- [x] Business Profile (ข้อมูลธุรกิจของผู้ใช้)
  - [x] AI extract ข้อมูลจากเว็บไซต์ → ภาษาไทย
- [x] `ai-scoring.service.ts` — Claude Haiku ให้คะแนน 0-100 + tier HOT/WARM/COLD
- [x] Score เก็บลงใน Lead (`aiScore`, `aiTier`, `aiReason`)
- [x] Fire-and-forget หลัง scrape แต่ละ lead

---

## Phase 4 — Email Workflow ✅

- [x] `email-generator.ts` — Claude สร้าง cold email ภาษาไทยตามข้อมูลบริษัท
- [x] `email-draft-generator.service.ts` — สร้าง EmailDraft หลัง lead ถูก select
  - [x] ตรวจสอบ confidence threshold → `PENDING_REVIEW` หรือ `APPROVED`
  - [x] ป้องกัน duplicate draft
- [x] `POST /leads/select` trigger draft generation แบบ fire-and-forget
- [x] `email-sender.ts` — ส่งผ่าน Brevo SDK
  - [x] Tracking pixel (open)
  - [x] Click tracking (link redirect)
  - [x] Unsubscribe header
- [x] Draft API: GET / approve / reject / regenerate
- [x] Email tracking via Brevo webhook (`/webhooks/brevo`)
  - [x] Events: DELIVERED, OPENED, CLICKED, SPAM, BOUNCED, UNSUBSCRIBED
  - [x] อัปเดต campaignLead status + campaign stats

---

## Phase 5 — Frontend ✅

- [x] Layout + Navigation (Noto Sans Thai, Green theme)
- [x] Dashboard (stats overview)
- [x] Campaigns page (list + create)
- [x] Campaign Detail page
  - [x] Scraping trigger + job status polling
  - [x] Leads table (companyName, phone, email, website, rating, AI score, status)
  - [x] Bulk select + bulk delete
- [x] Business Profile page (AI extract จาก URL)
- [x] Drafts page (list ตาม status tabs)
- [x] Draft Review page (approve / reject / regenerate)

---

## Phase 6 — Credit System 🔜 (กำลังจะทำ)

- [ ] Credit model ใน Prisma (`UserCredit`, `CreditTransaction`)
- [ ] หัก 1 credit ต่อ 1 lead ที่ scrape+score
- [ ] Admin panel: เติม credit ให้ลูกค้า
- [ ] แสดง credit คงเหลือบน frontend (header/dashboard)
- [ ] Block scraping ถ้า credit หมด

---

## Phase 7 — Quality & UX Improvements 📋

- [ ] Re-score leads เก่าด้วย AI (bulk re-score endpoint)
- [ ] Filter leads ตาม AI tier (HOT / WARM / COLD)
- [ ] Pagination ที่ leads table
- [ ] Email preview modal (before approve)
- [ ] Campaign stats แบบ real-time (emails sent/opened/clicked)
- [ ] Lead detail page (ดูประวัติ email ทั้งหมด)

---

## Phase 8 — Growth Features 📋

- [ ] Multi-user (invite team members)
- [ ] Payment gateway (Omise) — ซื้อ credit pack online
- [ ] LINE Notify alerts (เมื่อมี reply หรือ lead HOT)
- [ ] CRM integration (HubSpot export)
- [ ] Email template editor (drag & drop)
- [ ] A/B testing subject lines

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript + Prisma |
| Database | PostgreSQL (Supabase) |
| AI | Claude (Anthropic) via OpenRouter |
| Lead Source | Google Maps Places API |
| Email | Brevo (send + tracking) |
| Frontend | React + Vite + TailwindCSS |
| Backend Host | VPS `157.85.98.97` + PM2 |
| Frontend Host | Vercel |

---

## ลำดับความสำคัญถัดไป

1. **Credit System** — จำเป็นก่อนขาย (Phase 6)
2. **Re-score + Filter** — ช่วย UX มาก (Phase 7)
3. **Payment** — เปิด self-serve ได้ (Phase 8)
