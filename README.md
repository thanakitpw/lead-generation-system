# LeadGen — Lead Generation & Outreach Automation MVP

ระบบ Automation สำหรับ B2B Lead Generation และ Cold Email Outreach พร้อม AI (OpenRouter) และ n8n

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM (Supabase) |
| AI | OpenRouter API (Claude / GPT-4o / Gemini) |
| Email | Brevo (Sendinblue) |
| Automation | n8n (self-hosted บน VPS) |
| Frontend | React + Vite + TailwindCSS |
| Notification | Line Notify |
| CRM | HubSpot (Free tier) |

## โครงสร้างโปรเจกต์

```
lead-generation/
├── backend/               # Express API Server (รันบน VPS เดียวกับ n8n)
│   ├── src/
│   │   ├── api/routes/    # Auth, Campaigns, Leads, Drafts, Analytics, Webhooks, Tracking
│   │   ├── ai/            # OpenRouter email generator
│   │   ├── outreach/      # Brevo email sender
│   │   ├── notifications/ # Line Notify
│   │   └── lib/           # Prisma client
│   └── prisma/
│       └── schema.prisma  # Database models
├── frontend/              # React + Vite UI (deploy บน Vercel)
│   └── src/
│       ├── pages/         # Dashboard, Campaigns, Drafts
│       └── stores/        # Zustand auth store
├── n8n-workflows/         # Import JSONs เข้า n8n บน VPS
│   ├── 01-scraping-pipeline.json
│   ├── 02-enrichment-pipeline.json
│   ├── 03-ai-email-generation.json
│   ├── 04-reply-detection.json
│   └── 05-hubspot-sync.json
└── docker-compose.yml     # PostgreSQL local dev เท่านั้น
```

---

## ✅ Checklist ขั้นตอนการติดตั้ง

### STEP 1 — ตั้งค่า Supabase (Database)

- [ ] เข้า [supabase.com](https://supabase.com) → **New Project**
- [ ] ตั้งชื่อ project: `leadgen-mvp` และกำหนด password
- [ ] ไปที่ **Settings → Database → Connection string → URI**
- [ ] คัดลอก connection string (mode: **Transaction** port 6543 สำหรับ production)
- [ ] ใส่ใน `backend/.env`:
  ```env
  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
  ```

> **หมายเหตุ:** ถ้ารันแค่ local ใช้ port `5432` (DIRECT_URL) ใน `DATABASE_URL` ได้เลย

---

### STEP 2 — กรอก API Keys ใน `backend/.env`

เปิดไฟล์ `backend/.env` แล้วกรอกค่าต่อไปนี้:

```env
# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=ใส่ข้อความยาวๆ อะไรก็ได้ เช่น my-super-secret-2026
JWT_EXPIRES_IN=7d

# Database (จาก Supabase)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# OpenRouter AI → https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-xxxxxxxxx
AI_MODEL=anthropic/claude-3-haiku

# Brevo Email → https://app.brevo.com/settings/keys/api
BREVO_API_KEY=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
BREVO_SENDER_EMAIL=your@email.com
BREVO_SENDER_NAME=Best Solutions

# Google Maps → https://console.cloud.google.com (เปิด Places API)
GOOGLE_MAPS_API_KEY=AIzaSyBNT04W4_7vdNYm3L8CE9-58tbMa-bTtQA

# HubSpot → Settings → Integrations → Private Apps
HUBSPOT_ACCESS_TOKEN=pat-na2-b1392fc5-60b3-446b-bc99-80e25c9cd121

# Line Notify → https://notify-bot.line.me/my/
LINE_NOTIFY_TOKEN=xxxxxxxxx

# n8n (URL ของ n8n บน VPS)
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook
```

---

### STEP 3 — รัน Backend บน Local (ทดสอบก่อน)

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

ทดสอบ: เปิด `http://localhost:3000/api/auth/login` ด้วย POST Body:
```json
{ "email": "admin@bestsolutionscorp.com", "password": "admin1234" }
```
ถ้าได้ token กลับมา = ✅ Backend ทำงานปกติ

---

### STEP 4 — รัน Frontend บน Local (ทดสอบก่อน)

```bash
cd frontend
npm install
npm run dev
```

- เปิด `http://localhost:5173`
- Login: `admin@bestsolutionscorp.com` / `admin1234`
- ทดสอบสร้าง Campaign ดูว่า UI ทำงานได้

---

### STEP 5 — Deploy Backend บน VPS (เดียวกับ n8n)

SSH เข้า VPS แล้วรัน:

```bash
# 1. Clone repo
git clone https://github.com/thanakitpw/lead-generation-system.git
cd lead-generation-system/backend

# 2. ติดตั้ง Node.js (ถ้ายังไม่มี)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. ตั้งค่า .env
cp .env.example .env
nano .env   # กรอก API keys ทั้งหมด (เหมือน local แต่เปลี่ยน NODE_ENV=production)

# 4. Install + migrate
npm install
npx prisma migrate deploy
npx prisma db seed
npm run build

# 5. รันด้วย PM2
npm install -g pm2
pm2 start dist/index.js --name leadgen-backend
pm2 startup    # ให้ auto-start เมื่อ VPS reboot
pm2 save
```

ตรวจสอบ: `pm2 status` และ `pm2 logs leadgen-backend`

> **หลังจากนี้ Backend URL จะเป็น** `http://localhost:3000` (เข้าถึงจาก n8n ใน VPS เดียวกัน)
> หรือ `http://YOUR_VPS_IP:3000` (เข้าถึงจากภายนอก)

---

### STEP 6 — Import n8n Workflows บน VPS

1. เข้า n8n dashboard บน VPS ของคุณ
2. **Settings → Variables** เพิ่ม:

   | Variable | ค่า |
   |---|---|
   | `BACKEND_URL` | `http://localhost:3000` (เพราะอยู่ VPS เดียวกัน) |
   | `GOOGLE_MAPS_API_KEY` | Google Maps API Key |
   | `OPENROUTER_API_KEY` | OpenRouter API Key |
   | `LINE_NOTIFY_TOKEN` | Line Notify Token |
   | `HUBSPOT_ACCESS_TOKEN` | HubSpot Access Token |
   | `FRONTEND_URL` | URL ของ Frontend (Vercel URL) |

3. **Settings → Credentials → Add → Header Auth**
   - Name: `Backend API Auth`
   - Header Name: `Authorization`
   - Header Value: `Bearer <JWT_TOKEN>` (login แล้วเอา token มาใส่)

4. **Import workflows** ตามลำดับ:
   - `01-scraping-pipeline.json`
   - `02-enrichment-pipeline.json`
   - `03-ai-email-generation.json`
   - `04-reply-detection.json`
   - `05-hubspot-sync.json`

5. **Activate** แต่ละ workflow (toggle สีเขียว)

6. ตั้งค่า **Brevo Webhook** ใน [Brevo Dashboard](https://app.brevo.com):
   - URL: `http://YOUR_VPS_IP:3000/api/webhooks/brevo`
   - Events: `sent`, `opened`, `clicked`, `replied`

---

### STEP 7 — Deploy Frontend บน Vercel

```bash
# ติดตั้ง Vercel CLI (ครั้งเดียว)
npm install -g vercel

cd frontend
vercel
```

หรือผ่าน [vercel.com](https://vercel.com):
1. **Add New Project → Import Git Repository**
2. เลือก `lead-generation-system`
3. Root Directory: `frontend`
4. Framework: `Vite`
5. Environment Variables:
   ```
   VITE_API_URL=http://YOUR_VPS_IP:3000
   ```
6. Deploy → ได้ URL เช่น `https://leadgen-xxx.vercel.app`

> นำ Vercel URL กลับไปอัปเดต `FRONTEND_URL` ใน n8n Variables และ `APP_URL` ใน backend `.env`

---

### STEP 8 — ทดสอบ End-to-End

- [ ] Login ผ่าน Frontend ได้
- [ ] สร้าง Campaign ใหม่ได้
- [ ] กด Start Campaign → n8n workflow 01 ทำงาน (scrape Google Maps)
- [ ] รอ 10 นาที → workflow 02 หา email จาก website
- [ ] รอ 5 นาที → workflow 03 AI สร้าง email draft
- [ ] ไปที่ `/drafts` → มี draft ที่ confidence < 0.75 รอ review
- [ ] กด Approve → Brevo ส่งอีเมลจริง
- [ ] ตอบอีเมลเทสต์ → workflow 04 ตรวจจับ reply
- [ ] Line Notify แจ้งเตือน + workflow 05 สร้าง Deal ใน HubSpot

---

## Default Login

- **Email:** `admin@bestsolutionscorp.com`
- **Password:** `admin1234`

---

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

---

## Database Schema

- **User** — ผู้ใช้งาน
- **Campaign** — แคมเปญ outreach
- **Lead** — ข้อมูลบริษัท/ผู้ติดต่อ
- **CampaignLead** — junction table เชื่อม Campaign + Lead
- **EmailDraft** — อีเมลที่ AI สร้าง
- **EmailEvent** — tracking events (open, click, reply)
- **ScrapingJob** — สถานะการ scrape Google Maps
- **Unsubscribe** — รายการ unsubscribe
- **ApiUsageLog** — tracking API costs (OpenRouter usage)

---

## n8n Workflows

| ไฟล์ | หน้าที่ | Trigger |
|---|---|---|
| `01-scraping-pipeline.json` | Scrape Google Maps | POST webhook จาก Backend |
| `02-enrichment-pipeline.json` | หา Email จาก Website | Schedule ทุก 10 นาที |
| `03-ai-email-generation.json` | AI สร้าง + ส่ง Email | Schedule ทุก 5 นาที |
| `04-reply-detection.json` | ตรวจจับการตอบกลับ | POST webhook จาก Brevo |
| `05-hubspot-sync.json` | สร้าง Contact + Deal ใน HubSpot | POST webhook จาก Backend |

ดูรายละเอียดเพิ่มเติมใน `n8n-workflows/README.md`
