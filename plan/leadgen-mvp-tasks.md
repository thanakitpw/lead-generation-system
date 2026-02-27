# Lead Generation & Outreach Automation — MVP Action Plan

โครงสร้างการทำงานแบ่งออกเป็น 4 ส่วนหลัก: **Database & Backend, n8n (Automation), Frontend, และ Integration/Testing** สำหรับการพัฒนาให้จบภายใน 2 สัปดาห์

---

## 🗄️ 1. Database & Backend (Node.js + Express + Prisma)

### 1.1 Setup & Infrastructure
- [x] ตั้งค่าโปรเจกต์ Node.js + TypeScript
- [x] ติดตั้ง Express.js และกำหนดโครงสร้างโฟลเดอร์ (Routes, Controllers, Services)
- [x] ตั้งค่า Environment Variables (`.env`) ตามที่ระบุใน PRD (Database, JWT, API Keys)
- [x] ติดตั้ง Prisma ORM และเชื่อมต่อกับ PostgreSQL

### 1.2 Database Schema (Prisma Models)
*สร้างตารางสำหรับ MVP เท่านั้น (ตัด Multi-tenant ทิ้งไปก่อน):*
- [x] `User`: เก็บข้อมูลผู้ใช้งานระบบ (MVP ใช้แค่ User เดียว)
- [x] `Campaign`: เก็บข้อมูลแคมเปญ (Target, limits, AI prompt, status)
- [x] `Lead`: ข้อมูลบริษัท, contact, email, status (รวมฟิลด์ `hubspot_contact_id`, `hubspot_deal_id`)
- [x] `CampaignLead` (Junction table): เชื่อม Campaign กับ Lead
- [x] `EmailDraft`: เก็บอีเมลที่ AI เจนขึ้นมา (subject, body, confidence, status)
- [x] `EmailEvent`: เก็บประวัติ tracking (sent, open, click, reply)
- [x] `ScrapingJob`: เก็บสถานะการทำงานของการดึงข้อมูลจาก Google Maps
- [ ] รัน Migration เพื่อสร้างตารางใน Database (ต้องมี DB รันก่อน)

### 1.3 Core & Auth APIs
- [x] `POST /api/auth/login`, `POST /api/auth/logout`: ระบบ Login ด้วย JWT
- [x] สร้าง Middleware สำหรับเช็ค JWT Authentication

### 1.4 Campaign & Leads APIs
- [x] `GET /api/campaigns`: ดึงรายการแคมเปญ
- [x] `POST /api/campaigns`: สร้างแคมเปญใหม่
- [x] `GET /api/campaigns/:id`: ดึงรายละเอียดแคมเปญ
- [x] `PUT /api/campaigns/:id/start`, `PUT /api/campaigns/:id/pause`: เปลี่ยนสถานะแคมเปญ
- [x] `GET /api/leads`: ดึงรายการ Leads พร้อมระบบ Pagination และ Filter สถานะ
- [x] `POST /api/scraping/start`, `GET /api/scraping/jobs/:id`: API สั่งเริ่ม scrape และเช็คสถานะ

### 1.5 Email Drafts & Analytics APIs
- [x] `GET /api/drafts`: ดึงอีเมลที่รอการตรวจสอบ (`status=pending_review`)
- [x] `POST /api/drafts/:id/approve`: อนุมัติส่งอีเมล (ยิงคำสั่งไปหา Brevo API)
- [x] `POST /api/drafts/:id/reject`, `POST /api/drafts/:id/regenerate`: ปฏิเสธ หรือให้ AI เขียนใหม่
- [x] `GET /api/analytics/overview`: ดึงข้อมูลภาพรวม (Total Leads, Mails Sent, Open/Reply rates)

### 1.6 Webhooks & Tracking APIs
- [x] `POST /api/webhooks/brevo`: รับ Webhook จาก Brevo เพื่ออัปเดตสถานะ Open/Click/Reply ลงตาราง `EmailEvent`
- [x] `GET /track/open/:draftId`: API สำหรับฝัง Tracking pixel ในอีเมล
- [x] `GET /track/click/:draftId`: API สำหรับ Track การคลิกลิงก์
- [x] `GET /unsubscribe/:token`: API สำหรับยกเลิกการรับข่าวสาร

---

## 🤖 2. Automation & AI (n8n Workflows)

### 2.1 Setup Credentials ใน n8n
- [ ] ผูก Google Maps API, Claude API, Brevo API, HubSpot API (Free), Line Notify
- [ ] เชื่อมต่อ n8n กับ PostgreSQL Database

### 2.2 Workflow 01: Scraping (Google Maps)
- [ ] **Trigger:** รับ Webhook จาก Backend (`/api/scraping/start`)
- [ ] **Action:** เรียก Google Maps/Places API ด้วย Keyword + Location
- [ ] **Action:** นำข้อมูลบริษัท (ชื่อ, เว็บไซต์, เบอร์โทร) บันทึกลงตาราง `leads`
- [ ] **Action:** อัปเดตสถานะใน `ScrapingJob` กลับไปที่ Backend

### 2.3 Workflow 02: Enrichment (Website Crawler)
- [ ] **Trigger:** รันอัตโนมัติทุกๆ 10 นาที (ดึง lead ที่ยังไม่มีอีเมล)
- [ ] **Action:** ค้นหาเว็บไซต์และ Extract หา Email Address
- [ ] **Action:** ตรวจสอบความถูกต้อง (MX Record verification)
- [ ] **Action:** บันทึกอีเมลกลับลงไปใน Database

### 2.4 Workflow 03: AI Email Generation & Sending
- [ ] **Trigger:** รันอัตโนมัติทุกๆ 5 นาที (ดึง lead ที่พร้อมส่ง)
- [ ] **Action:** ส่งข้อมูลให้ Claude API เขียน Personalized Email ตาม System prompt
- [ ] **Condition:**
  - ถ้า Confidence Score **>= 0.75**: ส่งอีเมลผ่าน Brevo ทันที และอัปเดต Database
  - ถ้า Confidence Score **< 0.75**: เปลี่ยนสถานะเป็น `pending_review` บันทึกลงตาราง `EmailDraft` และส่งแจ้งเตือนเข้า **Line Notify** เพื่อให้คนมา Review

### 2.5 Workflow 04 & 05: Reply Detection & HubSpot Sync
- [ ] **Trigger:** ตรวจสอบอีเมลตอบกลับ (Check Gmail / Brevo Webhook) ทุก 15 นาที
- [ ] **Action (Workflow 04):** อัปเดตสถานะ lead ใน Database เป็น `replied`
- [ ] **Action (Workflow 05):** สร้าง Contact ใหม่ใน HubSpot อัตโนมัติ
- [ ] **Action (Workflow 05):** สร้าง Deal ใหม่ใน HubSpot ย้ายไป Stage "Contacted"
- [ ] **Action (Workflow 05):** แนบ Note เป็นเนื้อหาอีเมลที่ลูกค้าตอบกลับ
- [ ] **Action:** ส่งแจ้งเตือน **Line Notify** ว่า "มีคนตอบอีเมล! 🔗 พร้อมลิงก์ไป HubSpot Deal"

---

## 💻 3. Frontend (React + Vite + Tailwind CSS)

### 3.1 Setup & Structure
- [x] สร้างโปรเจกต์ React + Vite + TypeScript
- [x] ติดตั้ง Tailwind CSS และ UI Library
- [x] ติดตั้ง React Router DOM และ Axios

### 3.2 Auth & Layout
- [x] สร้างหน้า Login (`/login`)
- [x] สร้าง Main Layout ประกอบด้วย Sidebar Navigation (Dashboard, Campaigns, Review Drafts)
- [x] กำหนด Theme สีตาม PRD (Primary: Blue, Success: Green, Warning: Amber, Error: Red)

### 3.3 Dashboard Page (`/`)
- [x] สร้างการ์ดแสดง KPI: Total Leads, Emails Sent, Open Rate, Reply Rate
- [x] แสดงจำนวน API Cost (THB)
- [x] สร้างคอมโพเนนต์ Recent Activity Feed
- [x] สร้าง Badge แจ้งเตือนจำนวน Pending Review (ถ้ามี)

### 3.4 Campaign Management (`/campaigns`)
- [x] หน้า List: ตารางแสดงแคมเปญทั้งหมด และสถานะ
- [x] หน้า Create (`/campaigns/new`): ฟอร์มรับข้อมูล (Keyword, Location, Sender info, Limit, Threshold, AI Prompt)
- [x] หน้า Detail (`/campaigns/:id`): แสดงข้อมูลแคมเปญ พร้อมปุ่ม "Start / Pause"

### 3.5 Leads & Scraping UI
- [x] สร้างตารางแสดงรายชื่อบริษัท (ชื่อบริษัท, เว็บ, อีเมล, สถานะ) — อยู่ใน Campaign Detail
- [ ] ทำคอมโพเนนต์แสดง Progress การ Scrape แบบ Real-time (Phase 2)
- [ ] ทำตัวกรอง (Filter) ตาราง: สถานะ Verified, Status ต่างๆ (Phase 2)

### 3.6 Email Draft Review Queue (`/drafts`)
- [x] หน้าคิวตรวจสอบ: แสดงรายการอีเมลที่ Confidence < 0.75
- [x] หน้าตรวจสอบอีเมล (`/drafts/:id`):
  - แสดง Confidence Score Badge (🔴 / 🟡)
  - แก้ไข Subject และ Body HTML
  - ปุ่ม Action: Approve (สีเขียว), Reject (สีแดง), Regenerate AI (สีน้ำเงิน)

---

## 🧪 4. Integration & Testing

- [ ] ทดสอบ End-to-End Flow: จำลองการกรอกข้อมูลสร้างแคมเปญ -> Scrape Gmaps -> รอ AI เจนเมล์ -> ทดสอบกด Approve ให้ส่งจริง
- [ ] ยิงทดสอบเข้าอีเมล Test ของตัวเองเพื่อดูความถูกต้องของ HTML และ Tracking Pixel (Open/Click)
- [ ] ตอบกลับอีเมลเทสต์เพื่อดูว่า n8n ทริกเกอร์และสามารถยิงข้อมูลเข้า HubSpot ได้จริง
- [ ] ตรวจสอบ Error Handling ใน Frontend (Loading states, API Error messages)
