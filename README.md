# LeadGen — Lead Generation & Outreach Automation MVP

ระบบ Automation สำหรับ B2B Lead Generation และ Cold Email Outreach พร้อม AI (Claude) และ n8n

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Claude API (Anthropic) |
| Email | Brevo (Sendinblue) |
| Automation | n8n |
| Frontend | React + Vite + TailwindCSS |
| Notification | Line Notify |

## โครงสร้างโปรเจกต์

```
lead-generation/
├── backend/          # Express API Server
│   ├── src/
│   │   ├── api/routes/    # Auth, Campaigns, Leads, Drafts, Analytics, Webhooks, Tracking
│   │   ├── ai/            # Claude email generator
│   │   ├── outreach/      # Brevo email sender
│   │   ├── notifications/ # Line Notify
│   │   └── lib/           # Prisma client
│   └── prisma/
│       └── schema.prisma  # Database models
├── frontend/         # React + Vite UI
│   └── src/
│       ├── pages/         # Dashboard, Campaigns, Drafts
│       └── stores/        # Zustand auth store
├── n8n-workflows/    # Automation workflow JSONs
└── docker-compose.yml
```

## Quick Start

### 1. เริ่ม Database + n8n

```bash
docker-compose up -d
```

### 2. Setup Backend

```bash
cd backend
cp .env.example .env
# แก้ไข .env ใส่ API keys ต่างๆ

npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Backend จะรันที่ `http://localhost:3000`

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend จะรันที่ `http://localhost:5173`

## Default Login

- **Email:** `admin@bestsolutionscorp.com`
- **Password:** `admin1234`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login + JWT token |
| GET | `/api/campaigns` | ดึงรายการแคมเปญ |
| POST | `/api/campaigns` | สร้างแคมเปญ |
| PUT | `/api/campaigns/:id/start` | เริ่มแคมเปญ |
| PUT | `/api/campaigns/:id/pause` | หยุดแคมเปญ |
| GET | `/api/leads` | ดึง leads (pagination + filter) |
| POST | `/api/scraping/start` | เริ่ม scraping job |
| GET | `/api/scraping/jobs/:id` | เช็คสถานะ scraping |
| GET | `/api/drafts` | ดึง email drafts |
| POST | `/api/drafts/:id/approve` | Approve + ส่งอีเมล |
| POST | `/api/drafts/:id/reject` | Reject draft |
| POST | `/api/drafts/:id/regenerate` | สร้าง draft ใหม่ด้วย AI |
| GET | `/api/analytics/overview` | Dashboard stats |
| POST | `/api/webhooks/brevo` | Brevo email events |
| POST | `/api/webhooks/n8n` | n8n callbacks |
| GET | `/track/open/:draftId` | Email open tracking pixel |
| GET | `/track/click/:draftId` | Click tracking redirect |
| GET | `/track/unsubscribe/:draftId` | Unsubscribe handler |

## Environment Variables (Backend)

ดู `.env.example` สำหรับรายการทั้งหมด

## Database Schema

- **User** — ผู้ใช้งาน
- **Campaign** — แคมเปญ outreach
- **Lead** — ข้อมูลบริษัท/ผู้ติดต่อ
- **CampaignLead** — junction table เชื่อม Campaign + Lead
- **EmailDraft** — อีเมลที่ AI สร้าง
- **EmailEvent** — tracking events (open, click, reply)
- **ScrapingJob** — สถานะการ scrape Google Maps
- **Unsubscribe** — รายการ unsubscribe
- **ApiUsageLog** — tracking API costs

## n8n Workflows (Phase 2)

- `01-scraping-pipeline.json` — Scrape Google Maps
- `02-enrichment-pipeline.json` — Crawl website + find email
- `03-email-sending.json` — Generate AI email + send
- `04-reply-detection.json` — ตรวจสอบการตอบกลับ
