# n8n Workflows — Lead Generation System

## วิธี Import

1. เข้า n8n → **Settings → Import workflow**
2. เลือกไฟล์ `.json` ตามลำดับ
3. ตั้งค่า Credentials และ Environment Variables ตามด้านล่าง

---

## Workflows

### 01 - Scraping Pipeline
**ไฟล์:** `01-scraping-pipeline.json`
**Trigger:** HTTP POST webhook จาก Backend (`/api/scraping/start`)
**ขั้นตอน:**
1. รับ `campaignId`, `keywords`, `location`, `maxResults`
2. ค้นหาสถานที่ผ่าน Google Places Text Search API
3. ดึงรายละเอียดแต่ละสถานที่ (website, phone) ผ่าน Place Details API
4. ส่งข้อมูล Lead กลับไปบันทึกที่ Backend ทีละรายการ
5. อัปเดตสถานะ Job เป็น `COMPLETED`

### 02 - Enrichment Pipeline
**ไฟล์:** `02-enrichment-pipeline.json`
**Trigger:** Schedule ทุก 10 นาที
**ขั้นตอน:**
1. ดึง Leads ที่มี website แต่ยังไม่มี email จาก Backend
2. Crawl แต่ละเว็บไซต์
3. Extract email ด้วย Regex (เลือก `info@`, `contact@`, `sales@` ก่อน)
4. ส่ง email กลับไปบันทึกที่ Backend

### 03 - AI Email Generation & Sending
**ไฟล์:** `03-ai-email-generation.json`
**Trigger:** Schedule ทุก 5 นาที
**ขั้นตอน:**
1. ดึง Leads ที่มี email และพร้อมส่ง (status=NEW)
2. สร้าง prompt จาก Lead + Campaign data
3. เรียก Claude API สร้าง Personalized Email
4. ตรวจสอบ Confidence Score:
   - **>= threshold (default 0.75):** ส่งอีเมลผ่าน Brevo ทันที
   - **< threshold:** บันทึก Draft เป็น `PENDING_REVIEW` + แจ้ง Line Notify

### 04 - Reply Detection
**ไฟล์:** `04-reply-detection.json`
**Trigger:** HTTP POST webhook จาก Brevo (`POST /webhook/brevo-webhook`)
**ขั้นตอน:**
1. รับ Brevo email events (sent, opened, clicked, replied)
2. Filter เฉพาะ `replied` events
3. อัปเดตสถานะ Lead ใน Backend
4. ส่งแจ้งเตือน Line Notify

### 05 - HubSpot Sync
**ไฟล์:** `05-hubspot-sync.json`
**Trigger:** HTTP POST webhook จาก Backend (เมื่อ Lead ตอบอีเมล)
**ขั้นตอน:**
1. ค้นหา Contact เดิมใน HubSpot (ด้วย email)
2. ถ้าไม่มี → สร้าง Contact ใหม่
3. สร้าง Deal → Stage "Contacted"
4. แนบ Note เป็นเนื้อหาอีเมลที่รับ-ส่ง
5. แจ้ง Line Notify พร้อมลิงก์ไป HubSpot Deal
6. อัปเดต `hubspot_contact_id` และ `hubspot_deal_id` กลับใน Backend

---

## Environment Variables ที่ต้องตั้งใน n8n

ไปที่ **Settings → Variables** แล้วเพิ่ม:

| Variable | ค่า | ใช้ใน Workflow |
|---|---|---|
| `BACKEND_URL` | `http://localhost:3000` | ทุก workflow |
| `GOOGLE_MAPS_API_KEY` | Google Cloud API Key | 01 |
| `CLAUDE_API_KEY` | Anthropic API Key | 03 |
| `LINE_NOTIFY_TOKEN` | Line Notify Token | 03, 04, 05 |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot Private App Token | 05 |
| `FRONTEND_URL` | `http://localhost:5173` | 03, 04 |

---

## Credentials ที่ต้องสร้างใน n8n

### Backend API Auth (ใช้ใน Workflow 02, 03, 04, 05)
- ประเภท: **Header Auth**
- Name: `Backend API Auth`
- Header Name: `Authorization`
- Header Value: `Bearer <JWT_TOKEN_จาก_Login>`

> **หมายเหตุ:** ควรสร้าง Service Account Token สำหรับ n8n โดยเฉพาะ

---

## Webhook URLs (ที่ต้องกำหนดใน Backend .env)

หลัง Import workflow แล้ว copy Webhook URL จาก n8n มาใส่ใน `backend/.env`:

```
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_SCRAPING_WEBHOOK=http://localhost:5678/webhook/scraping-start
N8N_HUBSPOT_WEBHOOK=http://localhost:5678/webhook/hubspot-sync
```

และกำหนด Brevo Webhook URL ใน Brevo Dashboard:
```
https://your-domain.com/webhook/brevo-webhook
```
(หรือใช้ ngrok สำหรับ local testing)
