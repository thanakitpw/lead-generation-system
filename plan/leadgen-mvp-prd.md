# Product Requirements Document (PRD)
## Lead Generation & Outreach Automation — MVP

> **Version:** 1.1  
> **เป้าหมาย:** สร้าง MVP ที่ใช้งานได้จริงภายใน 2 สัปดาห์ เพื่อ validate market และหาลูกค้าได้ทันที  
> **Stack:** React + Node.js + PostgreSQL + n8n + Claude API + Brevo + HubSpot CRM (Free)

---

## 1. Problem Statement

ธุรกิจ SME ไทยที่ต้องการหาลูกค้าใหม่แบบ B2B มีปัญหาหลัก 3 อย่าง:

1. **ไม่รู้จะหาข้อมูลบริษัทที่ไหน** — ต้องค้นหาเองทีละบริษัท เสียเวลามาก
2. **ส่ง email แบบ mass** — ลูกค้าไม่ตอบเพราะไม่ personalized
3. **ไม่มี system track ผล** — ไม่รู้ว่าใครเปิดอ่าน ใครสนใจ

**Solution:** ระบบที่ scrape บริษัทจาก Google Maps → หา email อัตโนมัติ → ให้ AI เขียน email เฉพาะสำหรับแต่ละบริษัท → ส่งและ track ผลอัตโนมัติ → sync กับ HubSpot CRM อัตโนมัติ

---

## 2. Tool Roles (MVP)

| Tool | บทบาท | ค่าใช้จ่าย |
|------|--------|-----------|
| **n8n** | Automation engine เชื่อมทุกอย่าง | ฟรี (self-hosted) |
| **Brevo** | ส่ง email + track open/click/reply | ฟรี 300 emails/วัน |
| **HubSpot CRM** | เก็บ lead + track deal pipeline | ฟรีไม่มีหมดอายุ |
| **Line Notify** | แจ้งเตือน real-time | ฟรี |
| **Claude API** | เขียน personalized email | ~฿0.32/email |
| **PostgreSQL** | เก็บข้อมูลระบบทั้งหมด | ฟรี (self-hosted) |

**รวมต้นทุนเริ่มต้น: แทบ ฿0** (จ่ายแค่ Claude API ต่ออีเมล)

---

## 3. MVP Scope

### ✅ มีใน MVP
- Scrape บริษัทจาก Google Maps ด้วย keyword + location
- Crawl เว็บบริษัทเพื่อหา email
- AI เขียน personalized cold email ด้วย Claude
- ส่ง email ผ่าน Brevo พร้อม track open/click
- Review email ก่อนส่ง (ถ้า confidence ต่ำ)
- แจ้งเตือน Line เมื่อมีคนตอบกลับ
- **Auto sync lead → HubSpot เมื่อมีคนตอบ**
- **Auto create Deal ใน HubSpot pipeline**
- Dashboard แสดงผลพื้นฐาน

### ❌ ไม่มีใน MVP (Phase 2)
- Multi-tenant / SaaS
- Email sequence อัตโนมัติ (follow-up)
- CRM Kanban board ใน app (ใช้ HubSpot แทน)
- CSV import
- Billing / Subscription
- Multi-user / Team

---

## 4. User Stories

### US-01: สร้าง Campaign
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ สร้าง campaign ใหม่พร้อมกำหนด target
เพื่อที่จะ เริ่มต้น scrape และส่ง email ได้
```

**Acceptance Criteria:**
- กรอกชื่อ campaign, keyword, location ได้
- เลือก industry target ได้ (optional)
- กำหนด sender name + email ได้
- กำหนด daily send limit ได้ (default 50)
- กำหนด confidence threshold ได้ (default 0.75)
- บันทึก system prompt สำหรับ AI ได้

---

### US-02: Scrape Leads
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ กดปุ่มเดียวแล้วได้รายชื่อบริษัท + email
เพื่อที่จะ มีข้อมูลพร้อมส่ง email ได้ทันที
```

**Acceptance Criteria:**
- กดปุ่ม "Start Scraping" แล้วระบบทำงานอัตโนมัติ
- เห็น progress แบบ real-time (x/100 บริษัท)
- ผลลัพธ์แสดงในตาราง: ชื่อบริษัท, เว็บ, email, สถานะ
- filter ได้ว่า email verified หรือไม่
- scrape เสร็จแล้วแจ้งเตือนใน UI

---

### US-03: Review & Send Email
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ ดู email ที่ AI เขียนก่อนส่ง
เพื่อที่จะ มั่นใจว่า email ถูกต้องก่อนส่งจริง
```

**Acceptance Criteria:**
- เห็น email draft พร้อม confidence score
- ถ้า score ≥ threshold → ส่งอัตโนมัติ ไม่ต้องรอ review
- ถ้า score < threshold → แสดงใน review queue + Line Notify
- แก้ไข subject/body ก่อน approve ได้
- กด Approve ส่งทันที หรือ Reject พร้อมเหตุผลได้
- Regenerate ให้ AI เขียนใหม่ได้

---

### US-04: Track ผลลัพธ์
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ ดูว่าใครเปิดอ่านและคลิก email
เพื่อที่จะ รู้ว่าใครสนใจและควร follow-up
```

**Acceptance Criteria:**
- เห็น status ของทุก email: Sent / Opened / Clicked / Replied
- รับ Line Notify ทันทีเมื่อมีคนตอบ
- ดู timeline ของแต่ละ lead ได้
- เห็น open rate, click rate, reply rate รวม

---

### US-05: HubSpot CRM Sync
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ ให้ lead ที่ตอบอีเมลเข้า HubSpot อัตโนมัติ
เพื่อที่จะ track deal pipeline โดยไม่ต้อง add manual
```

**Acceptance Criteria:**
- เมื่อมีคนตอบอีเมล → n8n สร้าง Contact ใน HubSpot อัตโนมัติ
- สร้าง Deal พร้อม stage "Contacted" อัตโนมัติ
- Add Note บันทึกเนื้อหาอีเมลที่ตอบมา
- ถ้า lead เปิดอีเมลหลายครั้ง → update deal score อัตโนมัติ
- Line Notify แจ้งพร้อม link ไป HubSpot deal ได้เลย

---

### US-06: Dashboard Overview
```
ในฐานะ ผู้ใช้งาน
ฉันต้องการ เห็น KPI ภาพรวมหน้าเดียว
เพื่อที่จะ รู้ว่าระบบทำงานดีแค่ไหน
```

**Acceptance Criteria:**
- แสดง: Total Leads, Emails Sent, Open Rate, Reply Rate
- แสดง API Cost (THB) เดือนนี้
- แสดง Recent Activity feed
- แสดง Pending Review count (ถ้ามี)

---

## 5. Technical Requirements

### 5.1 Backend (Node.js + Express + TypeScript)

**Endpoints ที่ต้องมีใน MVP:**

```
POST  /api/auth/login
POST  /api/auth/logout

GET   /api/campaigns
POST  /api/campaigns
GET   /api/campaigns/:id
PUT   /api/campaigns/:id/start
PUT   /api/campaigns/:id/pause

GET   /api/leads?campaign_id=&status=&page=&limit=
GET   /api/leads/:id

POST  /api/scraping/start
GET   /api/scraping/jobs/:id

GET   /api/drafts?status=pending_review
GET   /api/drafts/:id
POST  /api/drafts/:id/approve
POST  /api/drafts/:id/reject
POST  /api/drafts/:id/regenerate

GET   /api/analytics/overview
GET   /api/analytics/campaigns/:id

POST  /api/webhooks/brevo
GET   /track/open/:draftId
GET   /track/click/:draftId
GET   /unsubscribe/:token
```

### 5.2 Database (PostgreSQL)

**Tables ที่ต้องมีใน MVP:**

```sql
-- users (single user สำหรับ MVP)
-- campaigns
-- leads (เพิ่ม field: hubspot_contact_id, hubspot_deal_id)
-- campaign_leads
-- email_drafts
-- email_events
-- scraping_jobs
-- unsubscribes
-- api_usage_logs
```

> ดู schema เต็มใน `plan.md`

### 5.3 n8n Workflows (5 workflows)

| Workflow | Trigger | ทำอะไร |
|----------|---------|--------|
| 01-scraping | Webhook | Google Maps → leads table |
| 02-enrichment | Schedule 10 min | Crawl website → หา email |
| 03-email-sending | Schedule 5 min | AI draft → send หรือ queue review |
| 04-reply-detection | Schedule 15 min | Check Gmail → update status |
| **05-hubspot-sync** | **Webhook (from 04)** | **reply detected → HubSpot Contact + Deal** |

### 5.4 HubSpot Integration (n8n → HubSpot API)

**Pipeline Stages:**
```
Lead In → Contacted → Demo Scheduled → Proposal Sent → Won / Lost
```

**n8n HubSpot Actions:**
```
เมื่อมีคนตอบอีเมล:
  → HubSpot: Create/Update Contact
      - email, firstname, lastname, company, phone
  → HubSpot: Create Deal
      - dealname: "[Company] - Lead from [Campaign]"
      - stage: "Contacted"
      - amount: (ว่างไว้ก่อน)
  → HubSpot: Create Note
      - body: เนื้อหาอีเมลที่ตอบมา + วันที่

เมื่อมีคนเปิดอีเมลหลายครั้ง (≥3):
  → HubSpot: Update Deal property "lead_score" += 10
```

**HubSpot Free ที่ใช้:**
- ✅ Contacts API
- ✅ Deals API
- ✅ Notes (Engagements) API
- ✅ Pipeline management
- ✅ ไม่มีค่าใช้จ่าย

### 5.5 Frontend (React + Vite + Tailwind)

**Pages ที่ต้องมีใน MVP:**

```
/login                  → Login page
/                       → Dashboard
/campaigns              → Campaign list
/campaigns/new          → Create campaign
/campaigns/:id          → Campaign detail + leads table
/drafts                 → Pending review queue
/drafts/:id             → Draft review page
```

---

## 6. UI/UX Requirements

### 6.1 Design Principles
- **Simple first** — ไม่มี feature ที่ไม่จำเป็น
- **Status ชัดเจน** — ทุกอย่างต้องรู้สถานะได้ทันที
- **Action ชัดเจน** — Primary button ใหญ่ ชัด กดแล้วรู้ว่าเกิดอะไร
- **Thai-friendly** — รองรับ font ภาษาไทย ไม่ตัดคำแปลก

### 6.2 Color System
| ความหมาย | สี | ใช้กับ |
|----------|-----|--------|
| Primary action | `#0284c7` (blue) | ปุ่มหลัก, link |
| Success / Sent | `#16a34a` (green) | status sent, approved |
| Warning / Review | `#d97706` (amber) | pending review, low confidence |
| Error / Failed | `#dc2626` (red) | failed, rejected |
| Neutral | `#64748b` (slate) | secondary text |

### 6.3 Key UI Components

**Confidence Score Badge:**
```
≥ 0.75  →  🟢 85%  (auto send)
0.50-0.74 →  🟡 62%  (review required)
< 0.50  →  🔴 45%  (manual only)
```

**Lead Status Badge:**
```
new → enriched → emailed → opened → clicked → replied → converted
```

**Scraping Progress:**
```
[████████░░░░░░░] 54/100 บริษัท | 32 พบ email | กำลัง scrape...
```

---

## 7. Data Flow (MVP)

```
User กรอก keyword + location
          ↓
Backend → trigger n8n workflow 01
          ↓
n8n: Google Maps API → ดึงบริษัท 100 แห่ง
          ↓
n8n: Insert leads → PostgreSQL
          ↓
n8n workflow 02 (auto trigger หลัง 2 นาที)
          ↓
n8n: Crawl แต่ละเว็บ → extract email
          ↓
n8n: Verify email MX record
          ↓
n8n: Update leads table
          ↓
User กด "Start Campaign"
          ↓
n8n workflow 03 (every 5 min)
          ↓
n8n: Claude API → generate personalized email
          ↓
          ├── confidence ≥ 0.75 → Brevo API → Send
          └── confidence < 0.75 → Insert draft → Line Notify
          ↓
Brevo Webhook → Backend → update email_events
          ↓
n8n workflow 04 (every 15 min)
          ↓
n8n: Check Gmail replies → update campaign_leads status = 'replied'
          ↓
n8n workflow 05 (trigger จาก 04)
          ↓
n8n: HubSpot API → Create Contact + Deal + Note
          ↓
Line Notify → "มีคนตอบอีเมล! 🔗 [HubSpot Deal Link]"
```

---

## 8. Non-Functional Requirements

| ด้าน | Requirement |
|------|-------------|
| Performance | Scrape 100 บริษัทเสร็จภายใน 30 นาที |
| Reliability | Email ส่งได้ไม่เกิน 50 emails/วัน (safe limit) |
| Security | JWT auth, env variables ไม่ hardcode |
| Deliverability | ใช้ Brevo เพื่อ IP reputation ดี |
| PDPA | มี unsubscribe link ทุก email |
| CRM Sync | HubSpot sync ภายใน 1 นาทีหลัง reply detected |

---

## 9. Environment Variables

```env
# App
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/leadgen_db

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Brevo
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=hello@bestsolutionscorp.com
BREVO_SENDER_NAME=Best Solutions Corp

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# HubSpot
HUBSPOT_ACCESS_TOKEN=pat-na1-...

# Line Notify
LINE_NOTIFY_TOKEN=...

# n8n
N8N_WEBHOOK_URL=https://n8n.bestsolutionscorp.com
N8N_API_KEY=...
```

---

## 10. MVP Limitations (Known)

สิ่งต่อไปนี้ **ไม่มีใน MVP** และรับรู้แล้ว:

- ไม่มี email sequence / follow-up อัตโนมัติ
- ไม่มี domain warm-up (ต้องระวัง spam)
- Google Maps scrape อาจได้ email ไม่ครบ (~40-60%)
- ไม่มี multi-user
- ไม่มี rate limiting per user
- reply detection ผ่าน Gmail polling (ไม่ real-time)
- HubSpot sync เฉพาะเมื่อมี reply เท่านั้น (ไม่ sync ทุก lead)

---

## 11. Success Metrics (MVP)

ถือว่า MVP สำเร็จเมื่อ:

- [ ] Scrape 100 บริษัทได้ใน 30 นาที
- [ ] หา email ได้อย่างน้อย 40% ของ leads
- [ ] ส่ง email ได้จริงและไม่ติด spam
- [ ] Open rate ≥ 20%
- [ ] Reply rate ≥ 3%
- [ ] Lead ที่ตอบกลับ sync เข้า HubSpot อัตโนมัติ 100%
- [ ] มีลูกค้าสนใจซื้อระบบ อย่างน้อย 1 คน ภายใน 30 วัน

---

## 12. Development Timeline

### Week 1: Backend + n8n

| วัน | Task |
|-----|------|
| 1 | Setup project, PostgreSQL schema, Prisma |
| 2 | Auth API + Campaign CRUD API |
| 3 | n8n workflow 01: Google Maps scraping |
| 4 | n8n workflow 02: Website crawler + email extractor |
| 5 | n8n workflow 03: AI email generator + Brevo sending |
| 6 | n8n workflow 04: Reply detection + Line Notify |
| 7 | n8n workflow 05: HubSpot sync (Contact + Deal + Note) |

### Week 2: Frontend + Integration

| วัน | Task |
|-----|------|
| 8 | Login page + Dashboard skeleton |
| 9 | Campaign list + Create campaign form |
| 10 | Leads table + scraping progress UI |
| 11 | Draft review page + approve/reject |
| 12 | Analytics overview + email timeline |
| 13-14 | Bug fixes + End-to-end test |

---

## 13. Definition of Done

แต่ละ feature ถือว่า done เมื่อ:

- [ ] ทำงานได้จริง end-to-end
- [ ] ไม่มี console error
- [ ] UI แสดงผล error state (ถ้า API fail)
- [ ] Loading state มีแสดง
- [ ] Test กับข้อมูลจริงแล้ว (ไม่ใช่ mock)

---

## 14. Risks & Mitigation

| Risk | โอกาส | แก้ไข |
|------|--------|--------|
| Google Maps block scraping | กลาง | ใช้ Places API หรือ rotate user-agent |
| Email ติด spam | สูง | ใช้ Brevo + อย่าส่งเกิน 50/วัน + มี unsubscribe |
| Website crawl ไม่เจอ email | สูง | Accept ว่า ~50% success rate คือ normal |
| Claude API cost เกิน | ต่ำ | Monitor ด้วย api_usage_logs table |
| Reply detection ช้า | กลาง | Poll ทุก 15 นาที ยอมรับได้สำหรับ MVP |
| HubSpot API rate limit | ต่ำ | Free plan รองรับ 100 req/10 sec เพียงพอ |
