# LeadGen AI — Business Model & Sales Overview

## ปัญหาที่แก้

ธุรกิจ B2B ส่วนใหญ่เสียเวลา **หาลูกค้าใหม่แบบ manual** — ค้นหาเอง เก็บเบอร์เอง เขียน email เอง ซ้ำซากและไม่ scale

> ทีม Sales ใช้เวลา 60-70% ไปกับการหา lead แทนที่จะ close deal

---

## Product ทำอะไร

| ขั้นตอน | Manual เดิม | LeadGen AI |
|--------|------------|-----------|
| หาลูกค้า | Search Google ทีละอัน | Scrape จาก Google Maps อัตโนมัติตาม keyword + location |
| วิเคราะห์ | เดาเอา | AI score HOT / WARM / COLD เทียบกับโปรไฟล์ธุรกิจของคุณ |
| เขียน email | Copy template ซ้ำๆ | AI สร้าง email เฉพาะบุคคลจากข้อมูลบริษัทนั้น |
| ส่ง + ติดตาม | ส่งเองแล้วลืม | ส่งผ่านระบบ ติดตาม open / click / reply อัตโนมัติ |

---

## กลุ่มลูกค้าเป้าหมาย

- **SME ไทย** ที่มีทีม Sales แต่ไม่มีเวลาหา lead
- **Agency** ที่รับทำ outreach ให้ลูกค้า
- **บริษัทที่ขาย B2B** product หรือ service
- **Startup** ที่ต้องการ traction เร็วแต่ทีมเล็ก

---

## จุดขาย (Value Proposition)

1. **ประหยัดเวลา 80%** — ไม่ต้อง search หาลูกค้าเอง
2. **AI บอกว่า lead ไหนน่าเจาะก่อน** — ไม่เสียเวลากับ cold lead
3. **Email เขียนเองตามโปรไฟล์ธุรกิจ** — ไม่ใช่ template ทั่วไป
4. **ภาษาไทยทั้งระบบ** — ออกแบบมาสำหรับตลาดไทยโดยเฉพาะ
5. **ทำงานขณะคุณนอนหลับ** — scrape + score + draft พร้อมรีวิวตอนเช้า

---

## ROI ที่ขายได้

> *"ถ้าปิดได้แค่ 1 deal จาก 1,000 leads — คุ้มค่า subscription ทั้งปี"*

| เปรียบเทียบ | LeadGen AI | จ้าง Telesales |
|------------|-----------|--------------|
| ค่าใช้จ่าย/เดือน | ฿990 – 5,990 | ฿15,000 – 25,000 |
| Leads/เดือน | 500 – 10,000 | 200 – 500 |
| ทำงาน 24/7 | ✅ | ❌ |
| ลาออก | ❌ | ✅ (บ่อย) |
| Learning curve | ไม่มี | 1-3 เดือน |

---

## Pricing Model: Credit Pack

> **1 Credit = 1 Lead** (รวม scrape + AI score)

| Pack | Credits | ราคา | ราคาต่อ lead | เหมาะกับ |
|------|---------|------|-------------|---------|
| Starter | 500 | ฿490 | ฿0.98 | ทดลองใช้ / ธุรกิจเล็ก |
| Pro | 2,000 | ฿1,490 | ฿0.75 | SME ที่ต้องการ scale |
| Business | 10,000 | ฿5,900 | ฿0.59 | Agency / บริษัทขนาดกลาง |
| Enterprise | Custom | ติดต่อ | ต่อรองได้ | องค์กรขนาดใหญ่ |

### Credit ใช้ทำอะไร
- **1 credit** = scrape 1 lead จาก Google Maps + AI score
- **ไม่มีวันหมดอายุ** — ใช้ได้จนหมด
- **เติมได้ตลอดเวลา** — ไม่ต้อง subscribe รายเดือน

### Add-on (ซื้อเพิ่มได้)
- Email draft generation: **+฿0.50/draft** (AI เขียน email เฉพาะบุคคล)
- Priority scraping: **+20%** (ดึงเร็วกว่า queue ปกติ)

---

## Competitive Advantage

| | LeadGen AI | Hunter.io | Apollo.io | Lusha |
|--|-----------|----------|----------|-------|
| Google Maps Thailand | ✅ | ❌ | ❌ | ❌ |
| AI Scoring ตามธุรกิจ | ✅ | ❌ | บางส่วน | ❌ |
| ภาษาไทย | ✅ | ❌ | ❌ | ❌ |
| ราคา (leads/เดือน) | ฿0.75 | ฿2-5 | ฿3-8 | ฿5-15 |
| Email automation | ✅ | บางส่วน | ✅ | ❌ |

---

## Tech Stack (สำหรับ Technical Buyer)

- **Backend**: Node.js + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: Claude (Anthropic) via OpenRouter
- **Lead Source**: Google Maps Places API
- **Email**: Brevo (transactional email + tracking)
- **Frontend**: React + Vite, deployed on Vercel
- **Infrastructure**: VPS + PM2

---

## Roadmap

### ✅ พร้อมใช้งานแล้ว
- Scrape leads จาก Google Maps
- AI Lead Scoring (HOT/WARM/COLD)
- Business Profile สำหรับ personalization
- Email Draft generation + Review
- Email tracking (open/click/reply)

### 🔜 กำลังพัฒนา
- Credit system + Admin panel
- Re-score leads เก่าด้วย AI
- Lead filter ตาม AI tier

### 📋 แผนอนาคต
- Multi-user / Multi-tenant
- Payment gateway (Omise)
- Email template editor
- CRM integration (HubSpot)
- LINE Notify alerts

---

## ติดต่อ / Demo

> **Best Solutions Co., Ltd.**
> Website: https://bestsolutionscorp.com
> Demo: https://frontend-inky-nine-64.vercel.app
