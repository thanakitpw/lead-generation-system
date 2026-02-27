# Lead Generation & Outreach Automation System
## Technical Plan — Full SaaS Architecture

> **เป้าหมาย:** ระบบ B2B Lead Generation ครบวงจร ที่ scrape บริษัทจาก Google Maps, enrich ข้อมูล contact, ส่ง AI-personalized cold email อัตโนมัติ พร้อม CRM และ Analytics Dashboard รองรับ Multi-tenant SaaS ในอนาคต

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Module 1: Lead Scraping](#4-module-1-lead-scraping)
5. [Module 2: Contact Enrichment](#5-module-2-contact-enrichment)
6. [Module 3: AI Email Personalization](#6-module-3-ai-email-personalization)
7. [Module 4: Outreach Sequence](#7-module-4-outreach-sequence)
8. [Module 5: CRM & Pipeline](#8-module-5-crm--pipeline)
9. [Module 6: Analytics Dashboard](#9-module-6-analytics-dashboard)
10. [n8n Workflow Design](#10-n8n-workflow-design)
11. [API Endpoints](#11-api-endpoints)
12. [Frontend Pages](#12-frontend-pages)
13. [SaaS Multi-tenant Architecture](#13-saas-multi-tenant-architecture)
14. [Development Phases](#14-development-phases)
15. [Environment Variables](#15-environment-variables)
16. [Folder Structure](#16-folder-structure)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  Dashboard │ Campaigns │ Leads │ CRM │ Analytics │ Settings     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API / WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                     BACKEND (Node.js + Express)                  │
│  Auth │ Leads API │ Campaign API │ Email API │ Analytics API     │
└────┬──────────┬──────────┬──────────┬──────────┬────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
 PostgreSQL   n8n       Claude     Brevo      Redis
 +pgvector  Workflows   AI API     Email      Cache
             │
     ┌───────┴────────┐
     ▼                ▼
Google Maps       Web Crawler
Scraping          (Playwright)
```

### Data Flow

```
[User creates campaign]
      ↓
[n8n: Scrape Google Maps by keyword + location]
      ↓
[n8n: Crawl each company website → extract email, contact name]
      ↓
[n8n: Verify email MX record]
      ↓
[n8n: Claude AI analyze website → generate personalized email]
      ↓
[n8n: Confidence Score check]
      ├─ Score ≥ 0.75 → Auto send via Brevo
      └─ Score < 0.75 → Queue for human review → Line Notify
      ↓
[Track: Sent → Opened → Clicked → Replied → Converted]
      ↓
[Analytics: update dashboard stats]
```

---

## 2. Tech Stack

### Backend
| Component | Technology | Reason |
|-----------|-----------|--------|
| Runtime | Node.js 20 LTS | Async-friendly, ecosystem |
| Framework | Express.js | Lightweight, flexible |
| Language | TypeScript | Type safety |
| ORM | Prisma | Type-safe DB access |
| Auth | JWT + bcrypt | Stateless auth |
| Queue | Bull + Redis | Background job processing |
| Validation | Zod | Schema validation |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Data fetching | React Query (TanStack) |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 15 + pgvector |
| Cache | Redis |
| Automation | n8n (self-hosted) |
| AI | Claude API (claude-3-5-sonnet) |
| Email sending | Brevo (Sendinblue) API |
| Web scraping | Playwright + Cheerio |
| Deployment | Railway / Render |
| Storage | Supabase Storage (avatars, attachments) |

### Notification
| Channel | Tool |
|---------|------|
| Line Notify | Line Notify API |
| Email notification | Brevo |
| In-app | WebSocket (Socket.io) |

---

## 3. Database Schema

### PostgreSQL Tables

```sql
-- ===== TENANTS (SaaS Multi-tenant) =====
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter', -- starter, growth, pro
  email_quota_monthly INT DEFAULT 500,
  lead_quota_monthly INT DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== USERS =====
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member', -- owner, admin, member
  line_notify_token VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== LEADS =====
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Company info
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  website VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  phone VARCHAR(50),
  google_maps_place_id VARCHAR(255),
  google_maps_rating DECIMAL(2,1),
  google_maps_reviews INT,
  
  -- Contact info
  contact_name VARCHAR(255),
  contact_title VARCHAR(100),
  email VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verification_status VARCHAR(50), -- valid, invalid, risky, unknown
  
  -- Enrichment
  website_crawled BOOLEAN DEFAULT false,
  website_crawled_at TIMESTAMPTZ,
  company_description TEXT,
  company_size VARCHAR(50), -- 1-10, 11-50, 51-200, 200+
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  -- Status
  status VARCHAR(50) DEFAULT 'new', -- new, enriched, emailed, replied, converted, unsubscribed, bounced
  source VARCHAR(100), -- google_maps, manual, csv_import
  
  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_embedding ON leads USING ivfflat (embedding vector_cosine_ops);

-- ===== CAMPAIGNS =====
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed, archived
  
  -- Targeting
  target_industry VARCHAR(100),
  target_location VARCHAR(100),
  target_keywords TEXT[], -- keywords for Google Maps search
  target_company_size VARCHAR(50),
  
  -- Email settings
  sender_name VARCHAR(255),
  sender_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  
  -- AI settings
  ai_model VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022',
  ai_temperature DECIMAL(2,1) DEFAULT 0.3,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.75,
  system_prompt TEXT,
  
  -- Sequence settings
  sequence_days INT[] DEFAULT '{0, 3, 7}', -- วันที่ส่ง follow-up
  
  -- Limits
  daily_send_limit INT DEFAULT 50,
  total_lead_limit INT DEFAULT 1000,
  
  -- Stats (denormalized for performance)
  stats_total_leads INT DEFAULT 0,
  stats_emails_sent INT DEFAULT 0,
  stats_emails_opened INT DEFAULT 0,
  stats_emails_clicked INT DEFAULT 0,
  stats_emails_replied INT DEFAULT 0,
  stats_converted INT DEFAULT 0,
  
  -- Schedule
  start_date DATE,
  end_date DATE,
  send_time_start TIME DEFAULT '09:00',
  send_time_end TIME DEFAULT '17:00',
  send_days INT[] DEFAULT '{1,2,3,4,5}', -- 1=Mon, 7=Sun
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CAMPAIGN LEADS (junction) =====
CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, opened, clicked, replied, converted, unsubscribed, bounced, failed
  sequence_step INT DEFAULT 0, -- 0=first email, 1=follow-up 1, 2=follow-up 2
  
  next_send_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, lead_id)
);

-- ===== EMAIL DRAFTS =====
CREATE TABLE email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_lead_id UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  
  -- Content
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sequence_step INT DEFAULT 0,
  
  -- AI metadata
  ai_model VARCHAR(100),
  ai_confidence DECIMAL(4,3),
  ai_tokens_used INT,
  ai_cost_usd DECIMAL(10,6),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, approved, sent, failed, rejected
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- Sending
  brevo_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== EMAIL EVENTS (tracking) =====
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_draft_id UUID REFERENCES email_drafts(id) ON DELETE CASCADE,
  campaign_lead_id UUID REFERENCES campaign_leads(id),
  tenant_id UUID REFERENCES tenants(id),
  
  event_type VARCHAR(50) NOT NULL, -- sent, delivered, opened, clicked, replied, bounced, spam, unsubscribed
  event_data JSONB, -- IP, user agent, clicked URL, etc.
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_draft_id ON email_events(email_draft_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_occurred ON email_events(occurred_at);

-- ===== EMAIL TEMPLATES =====
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sequence_step INT DEFAULT 0,
  industry VARCHAR(100), -- targeted industry
  
  -- Variables: {{company_name}}, {{contact_name}}, {{website}}, etc.
  variables TEXT[],
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== SCRAPING JOBS =====
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  
  -- Config
  keywords TEXT[] NOT NULL,
  location VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  max_results INT DEFAULT 100,
  
  -- Progress
  total_found INT DEFAULT 0,
  total_enriched INT DEFAULT 0,
  total_emails_found INT DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Raw results
  results JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== UNSUBSCRIBES =====
CREATE TABLE unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  reason VARCHAR(255),
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ===== API USAGE LOGS =====
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  
  service VARCHAR(100), -- claude, brevo, google_maps
  tokens_used INT,
  cost_usd DECIMAL(10,6),
  request_type VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Module 1: Lead Scraping

### 4.1 Google Maps Scraper

**Strategy:** ใช้ Google Places API หรือ Playwright scrape โดยตรง

```typescript
// src/scrapers/google-maps.scraper.ts

interface ScrapeConfig {
  keywords: string[];        // เช่น ["โรงงานอาหาร", "food factory"]
  location: string;          // เช่น "Bangkok, Thailand"
  radius: number;            // meters, default 50000
  maxResults: number;        // default 100
  industry?: string;
}

interface ScrapedLead {
  company_name: string;
  google_maps_place_id: string;
  address: string;
  city: string;
  province: string;
  phone?: string;
  website?: string;
  google_maps_rating?: number;
  google_maps_reviews?: number;
  industry?: string;
  raw_data: object;
}

class GoogleMapsScraper {
  // Option A: Google Places API (ถ้ามี API key)
  async scrapeViaAPI(config: ScrapeConfig): Promise<ScrapedLead[]>
  
  // Option B: Playwright scrape (ฟรี แต่ช้ากว่า)
  async scrapeViaPlaywright(config: ScrapeConfig): Promise<ScrapedLead[]>
  
  // Normalize results จากทั้ง 2 methods
  private normalizeResult(raw: any): ScrapedLead
}
```

**Google Places API Flow:**
```
1. Text Search API: POST /maps/api/place/textsearch/json
   params: query="โรงงาน Bangkok", key=API_KEY
   
2. ถ้า results < maxResults และมี next_page_token → ดึงหน้าต่อไป

3. Place Details API: GET /maps/api/place/details/json
   params: place_id=xxx, fields=name,address,phone,website,rating
   
4. Save to leads table + scraping_jobs table
```

**Rate Limiting:**
```typescript
// ใช้ p-limit เพื่อ limit concurrent requests
import pLimit from 'p-limit';
const limit = pLimit(5); // max 5 concurrent requests
```

### 4.2 CSV Import

```typescript
// รองรับ import จาก CSV ด้วย
// Required columns: company_name, website
// Optional: email, contact_name, phone, address
interface CSVImportConfig {
  file: Express.Multer.File;
  campaign_id: string;
  column_mapping: {
    company_name: string;
    website?: string;
    email?: string;
    contact_name?: string;
    phone?: string;
  };
}
```

---

## 5. Module 2: Contact Enrichment

### 5.1 Website Crawler

```typescript
// src/enrichment/website-crawler.ts

class WebsiteCrawler {
  // Pages to crawl in priority order
  private TARGET_PATHS = [
    '/contact', '/contact-us', '/ติดต่อ', '/ติดต่อเรา',
    '/about', '/about-us', '/เกี่ยวกับ',
    '/'
  ];
  
  async enrichLead(lead: Lead): Promise<EnrichmentResult> {
    // 1. Crawl target pages
    const pages = await this.crawlPages(lead.website);
    
    // 2. Extract emails
    const emails = this.extractEmails(pages);
    
    // 3. Extract contact names
    const contacts = this.extractContacts(pages);
    
    // 4. Extract company description
    const description = await this.extractDescription(pages);
    
    return { emails, contacts, description };
  }
  
  private extractEmails(html: string): string[] {
    // Regex patterns
    const patterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // obfuscated: name [at] domain [dot] com
      /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/gi,
    ];
    // filter out common non-contact emails
    const EXCLUDE = ['noreply', 'no-reply', 'donotreply', 'info@example'];
    return [...new Set(allEmails)].filter(e => !EXCLUDE.some(ex => e.includes(ex)));
  }
}
```

### 5.2 Email Verification

```typescript
// src/enrichment/email-verifier.ts

class EmailVerifier {
  async verify(email: string): Promise<VerificationResult> {
    // Step 1: Format validation
    const isValidFormat = this.validateFormat(email);
    
    // Step 2: MX record check (DNS lookup)
    const hasMX = await this.checkMXRecord(email);
    
    // Step 3: Disposable email check
    const isDisposable = this.checkDisposable(email);
    
    // Step 4: Common role email check (info@, admin@, etc.)
    const isRoleEmail = this.checkRoleEmail(email);
    
    return {
      email,
      status: this.determineStatus(isValidFormat, hasMX, isDisposable, isRoleEmail),
      // valid | invalid | risky | unknown
    };
  }
  
  private async checkMXRecord(email: string): Promise<boolean> {
    const domain = email.split('@')[1];
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  }
}
```

### 5.3 AI Company Analysis

```typescript
// ใช้ Claude วิเคราะห์เว็บบริษัทเพื่อ enrichment

const prompt = `
วิเคราะห์เว็บไซต์บริษัทต่อไปนี้และตอบใน JSON format:

Website content:
${websiteContent}

ตอบในรูปแบบ:
{
  "company_description": "อธิบายธุรกิจใน 2-3 ประโยค",
  "main_products_services": ["สินค้า/บริการหลัก"],
  "target_customers": "กลุ่มลูกค้าหลัก",
  "company_size": "1-10 | 11-50 | 51-200 | 200+",
  "pain_points": ["ปัญหาที่น่าจะมี"],
  "personalization_hooks": ["จุดที่ใช้ personalize email ได้"]
}
`;
```

---

## 6. Module 3: AI Email Personalization

### 6.1 Email Generation

```typescript
// src/ai/email-generator.ts

interface EmailGenerationInput {
  lead: Lead;
  campaign: Campaign;
  template?: EmailTemplate;
  sequence_step: number; // 0=intro, 1=followup1, 2=followup2
  website_analysis: CompanyAnalysis;
}

interface EmailGenerationOutput {
  subject: string;
  body_html: string;
  body_text: string;
  confidence: number;     // 0.0 - 1.0
  reasoning: string;      // AI's explanation
  tokens_used: number;
  cost_usd: number;
}

class AIEmailGenerator {
  async generate(input: EmailGenerationInput): Promise<EmailGenerationOutput> {
    const systemPrompt = this.buildSystemPrompt(input.campaign);
    const userPrompt = this.buildUserPrompt(input);
    
    const response = await claude.messages.create({
      model: input.campaign.ai_model,
      max_tokens: 1500,
      temperature: input.campaign.ai_temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    
    return this.parseResponse(response);
  }
  
  private buildSystemPrompt(campaign: Campaign): string {
    return `
คุณเป็นผู้เชี่ยวชาญด้านการเขียน B2B Cold Email ภาษาไทย

กฎสำคัญ:
1. เขียน email ที่ดูเป็นส่วนตัว ไม่ใช่ mass email
2. กล่าวถึงข้อมูลจริงของบริษัทผู้รับ (ชื่อ, ธุรกิจ, ปัญหาที่น่าจะมี)
3. Value proposition ชัดเจน ใน 1-2 ประโยค
4. ไม่เกิน 150 คำ สำหรับ intro email
5. มี CTA ที่ชัดเจน 1 อย่าง (นัด demo / ขอคุย 15 นาที)
6. ไม่ขายตรง ไม่ aggressive
7. ลงท้ายด้วย: ${campaign.sender_name}

ตอบใน JSON format เท่านั้น:
{
  "subject": "หัวข้ออีเมล",
  "body_html": "เนื้อหา HTML",
  "body_text": "เนื้อหา plain text",
  "confidence": 0.0-1.0,
  "reasoning": "เหตุผลที่ confidence ระดับนี้"
}
    `;
  }
  
  private buildUserPrompt(input: EmailGenerationInput): string {
    const { lead, website_analysis, sequence_step } = input;
    
    const stepContext = {
      0: 'แนะนำตัวครั้งแรก',
      1: 'Follow-up ครั้งที่ 1 (3 วันหลัง)',
      2: 'Follow-up ครั้งสุดท้าย (7 วันหลัง)'
    }[sequence_step];
    
    return `
ข้อมูลบริษัทผู้รับ:
- ชื่อบริษัท: ${lead.company_name}
- ประเภทธุรกิจ: ${website_analysis.company_description}
- สินค้า/บริการ: ${website_analysis.main_products_services?.join(', ')}
- ลูกค้าหลัก: ${website_analysis.target_customers}
- ชื่อผู้รับ: ${lead.contact_name || 'ทีมงาน'}
- ตำแหน่ง: ${lead.contact_title || ''}

สิ่งที่เราเสนอ:
${input.campaign.system_prompt}

ประเภทอีเมล: ${stepContext}
จุด personalization: ${website_analysis.personalization_hooks?.join(', ')}

เขียน email ที่เหมาะสมสำหรับบริษัทนี้โดยเฉพาะ
    `;
  }
}
```

### 6.2 Confidence Scoring Logic

```typescript
// Confidence ต่ำถ้า:
// - ไม่มีข้อมูล website analysis
// - contact_name ไม่มี
// - industry ไม่ชัดเจน
// - ไม่สามารถ personalize ได้จริง

function calculateConfidence(lead: Lead, analysis: CompanyAnalysis): number {
  let score = 1.0;
  
  if (!lead.contact_name) score -= 0.10;
  if (!analysis.company_description) score -= 0.20;
  if (!analysis.main_products_services?.length) score -= 0.15;
  if (!analysis.personalization_hooks?.length) score -= 0.10;
  if (!lead.website) score -= 0.20;
  
  return Math.max(0.3, score);
}
```

---

## 7. Module 4: Outreach Sequence

### 7.1 Sequence Engine

```typescript
// src/outreach/sequence-engine.ts

class SequenceEngine {
  // Called by n8n every 5 minutes
  async processQueue(): Promise<void> {
    // หา campaign_leads ที่ถึงเวลาส่งแล้ว
    const pending = await db.campaign_leads.findMany({
      where: {
        status: { in: ['pending', 'opened', 'clicked'] },
        next_send_at: { lte: new Date() },
        sequence_step: { lt: 3 }
      },
      include: { lead: true, campaign: true }
    });
    
    for (const cl of pending) {
      await this.processLead(cl);
    }
  }
  
  async processLead(campaignLead: CampaignLead): Promise<void> {
    // 1. Generate email
    const draft = await emailGenerator.generate({
      lead: campaignLead.lead,
      campaign: campaignLead.campaign,
      sequence_step: campaignLead.sequence_step,
    });
    
    // 2. Check confidence threshold
    if (draft.confidence >= campaignLead.campaign.confidence_threshold) {
      // Auto send
      await this.sendEmail(draft);
      await this.updateStatus(campaignLead, 'sent');
    } else {
      // Queue for review + notify
      await this.queueForReview(draft, campaignLead);
      await this.notifyViaLine(campaignLead, draft);
    }
    
    // 3. Schedule next follow-up
    await this.scheduleNextStep(campaignLead);
  }
  
  private async scheduleNextStep(campaignLead: CampaignLead): Promise<void> {
    const nextStep = campaignLead.sequence_step + 1;
    const delayDays = campaignLead.campaign.sequence_days[nextStep];
    
    if (delayDays !== undefined) {
      await db.campaign_leads.update({
        where: { id: campaignLead.id },
        data: {
          sequence_step: nextStep,
          next_send_at: addDays(new Date(), delayDays)
        }
      });
    }
  }
}
```

### 7.2 Email Sending via Brevo

```typescript
// src/outreach/email-sender.ts

class EmailSender {
  private brevo = new SibApiV3Sdk.TransactionalEmailsApi();
  
  async send(draft: EmailDraft, lead: Lead, campaign: Campaign): Promise<string> {
    // Check unsubscribe list
    const isUnsubscribed = await this.checkUnsubscribe(lead.email, campaign.tenant_id);
    if (isUnsubscribed) throw new Error('Email is unsubscribed');
    
    const result = await this.brevo.sendTransacEmail({
      sender: { name: campaign.sender_name, email: campaign.sender_email },
      to: [{ email: lead.email, name: lead.contact_name || lead.company_name }],
      replyTo: { email: campaign.reply_to_email },
      subject: draft.subject,
      htmlContent: this.addTrackingPixel(draft.body_html, draft.id),
      textContent: draft.body_text,
      headers: {
        'List-Unsubscribe': `<https://app.bestsolutionscorp.com/unsubscribe/${draft.id}>`,
      },
      params: { draft_id: draft.id }
    });
    
    return result.messageId;
  }
  
  private addTrackingPixel(html: string, draftId: string): string {
    const pixel = `<img src="https://app.bestsolutionscorp.com/track/open/${draftId}" width="1" height="1" />`;
    return html.replace('</body>', `${pixel}</body>`);
  }
  
  private addClickTracking(html: string, draftId: string): string {
    // Replace all <a href="..."> with tracked URLs
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => `href="https://app.bestsolutionscorp.com/track/click/${draftId}?url=${encodeURIComponent(url)}"`
    );
  }
}
```

### 7.3 Webhook Handler (Brevo Events)

```typescript
// POST /api/webhooks/brevo
// Brevo จะส่ง webhook เมื่อมี event

router.post('/webhooks/brevo', async (req, res) => {
  const events = req.body; // Array of events
  
  for (const event of events) {
    const { event: eventType, messageId, email } = event;
    
    // Find draft by messageId
    const draft = await db.email_drafts.findFirst({
      where: { brevo_message_id: messageId }
    });
    
    if (!draft) continue;
    
    // Log event
    await db.email_events.create({
      data: {
        email_draft_id: draft.id,
        campaign_lead_id: draft.campaign_lead_id,
        tenant_id: draft.tenant_id,
        event_type: mapBrevoEvent(eventType), // delivered, opened, clicked, etc.
        event_data: event,
      }
    });
    
    // Update campaign_lead status
    await updateCampaignLeadStatus(draft.campaign_lead_id, eventType);
    
    // Handle unsubscribe
    if (eventType === 'unsubscribe') {
      await db.unsubscribes.create({
        data: { tenant_id: draft.tenant_id, email }
      });
    }
  }
  
  res.json({ ok: true });
});
```

---

## 8. Module 5: CRM & Pipeline

### 8.1 Pipeline Stages

```
New Lead → Enriched → Emailed → Opened → Clicked → Replied → Converted
                                                          ↓
                                                    Unsubscribed / Bounced
```

### 8.2 Lead Scoring

```typescript
// src/crm/lead-scorer.ts

function calculateLeadScore(lead: Lead, events: EmailEvent[]): number {
  let score = 0;
  
  // Base score
  if (lead.email_verified) score += 20;
  if (lead.contact_name) score += 10;
  if (lead.website) score += 10;
  
  // Engagement score
  const hasOpened = events.some(e => e.event_type === 'opened');
  const hasClicked = events.some(e => e.event_type === 'clicked');
  const hasReplied = events.some(e => e.event_type === 'replied');
  
  if (hasOpened) score += 20;
  if (hasClicked) score += 30;
  if (hasReplied) score += 50;
  
  // Open count bonus
  const openCount = events.filter(e => e.event_type === 'opened').length;
  score += Math.min(openCount * 5, 20);
  
  return Math.min(score, 100);
}
```

### 8.3 Line Notify Integration

```typescript
// src/notifications/line-notify.ts

class LineNotifier {
  async notifyNewReply(lead: Lead, emailDraft: EmailDraft, user: User): Promise<void> {
    if (!user.line_notify_token) return;
    
    const message = `
📧 มีคนตอบอีเมล!

บริษัท: ${lead.company_name}
จาก: ${lead.email}
Subject: ${emailDraft.subject}

🔗 ดูรายละเอียด: https://app.bestsolutionscorp.com/leads/${lead.id}
    `;
    
    await this.send(user.line_notify_token, message);
  }
  
  async notifyLowConfidenceDraft(
    draft: EmailDraft, 
    lead: Lead, 
    user: User
  ): Promise<void> {
    const message = `
⚠️ AI Draft รอ Review

บริษัท: ${lead.company_name}
Confidence: ${(draft.ai_confidence * 100).toFixed(0)}%
Subject: ${draft.subject}

🔗 Review: https://app.bestsolutionscorp.com/drafts/${draft.id}
    `;
    
    await this.send(user.line_notify_token, message);
  }
}
```

---

## 9. Module 6: Analytics Dashboard

### 9.1 Key Metrics

```typescript
// src/analytics/metrics.ts

interface CampaignMetrics {
  // Volume
  total_leads: number;
  emails_sent: number;
  
  // Rates
  open_rate: number;        // opened / sent
  click_rate: number;       // clicked / sent
  reply_rate: number;       // replied / sent
  conversion_rate: number;  // converted / sent
  
  // Cost
  total_api_cost_usd: number;
  cost_per_lead: number;
  cost_per_reply: number;
  cost_per_conversion: number;
  
  // AI Performance
  avg_confidence_score: number;
  auto_send_rate: number;   // auto sent / total
  
  // Time series
  daily_stats: DailyStat[];
}

async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  // Query aggregated data from email_events + campaign_leads
}
```

### 9.2 Dashboard API

```typescript
// GET /api/analytics/overview
// Returns: overall stats across all campaigns for tenant

// GET /api/analytics/campaigns/:id
// Returns: detailed metrics for specific campaign

// GET /api/analytics/leads
// Returns: lead funnel stats

// GET /api/analytics/costs
// Returns: API cost breakdown by service + campaign
```

---

## 10. n8n Workflow Design

### Workflow 1: Lead Scraping Pipeline

```json
Trigger: Webhook (POST /n8n/scrape-start)
  ↓
Node: Set Variables (keywords, location, maxResults)
  ↓
Node: HTTP Request → Google Places API (Text Search)
  ↓
Node: Loop → For each place
  ↓
  Node: HTTP Request → Google Places Details API
  ↓
  Node: PostgreSQL → Insert lead (if not duplicate)
  ↓
Node: HTTP Request → Notify Backend (scraping complete)
  ↓
Node: Webhook Response
```

### Workflow 2: Contact Enrichment Pipeline

```json
Trigger: Schedule (every 10 min) OR Webhook
  ↓
Node: PostgreSQL → Get leads WHERE website_crawled=false LIMIT 20
  ↓
Node: Loop → For each lead
  ↓
  Node: HTTP Request → Crawl website (via Backend API)
  ↓
  Node: IF has email
    ├─ YES: Node: HTTP Request → Verify email
    │         ↓
    │       Node: PostgreSQL → Update lead (email, verified status)
    └─ NO:  Node: PostgreSQL → Update lead (website_crawled=true)
  ↓
Node: HTTP Request → Notify Backend (enrichment complete)
```

### Workflow 3: Email Generation & Sending

```json
Trigger: Schedule (every 5 min)
  ↓
Node: PostgreSQL → Get campaign_leads WHERE next_send_at <= NOW() LIMIT 10
  ↓
Node: IF has results
  ↓
Node: Loop → For each campaign_lead
  ↓
  Node: HTTP Request → Backend API: Generate AI Email
  ↓
  Node: IF confidence >= threshold
    ├─ YES: Node: HTTP Request → Backend API: Send Email
    │         ↓
    │       Node: PostgreSQL → Update campaign_lead (status=sent)
    └─ NO:  Node: HTTP Request → Backend API: Queue for Review
              ↓
            Node: HTTP Request → Line Notify API
```

### Workflow 4: Reply Detection

```json
Trigger: Schedule (every 15 min)
  ↓
Node: HTTP Request → Gmail API: Check inbox for replies
  ↓
Node: IF new replies found
  ↓
Node: Loop → For each reply
  ↓
  Node: PostgreSQL → Find campaign_lead by sender email
  ↓
  Node: PostgreSQL → Update status = 'replied'
  ↓
  Node: HTTP Request → Line Notify
  ↓
  Node: HTTP Request → Backend API: Log email event
```

---

## 11. API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Campaigns
```
GET    /api/campaigns                    // List campaigns
POST   /api/campaigns                    // Create campaign
GET    /api/campaigns/:id                // Get campaign details
PUT    /api/campaigns/:id                // Update campaign
DELETE /api/campaigns/:id                // Archive campaign
POST   /api/campaigns/:id/start          // Activate campaign
POST   /api/campaigns/:id/pause          // Pause campaign
GET    /api/campaigns/:id/metrics        // Get campaign metrics
```

### Leads
```
GET    /api/leads                        // List leads (with filters)
POST   /api/leads                        // Create lead manually
GET    /api/leads/:id                    // Get lead details
PUT    /api/leads/:id                    // Update lead
DELETE /api/leads/:id                    // Delete lead
POST   /api/leads/import                 // Import CSV
POST   /api/leads/:id/enrich             // Trigger enrichment
GET    /api/leads/:id/timeline           // Email history
```

### Scraping
```
POST   /api/scraping/start               // Start scraping job
GET    /api/scraping/jobs                // List scraping jobs
GET    /api/scraping/jobs/:id            // Job status & results
POST   /api/scraping/jobs/:id/cancel     // Cancel job
```

### Email Drafts
```
GET    /api/drafts                       // List drafts pending review
GET    /api/drafts/:id                   // Get draft detail
POST   /api/drafts/:id/approve           // Approve & send
POST   /api/drafts/:id/reject            // Reject with reason
PUT    /api/drafts/:id                   // Edit draft content
POST   /api/drafts/:id/regenerate        // Regenerate with AI
```

### Analytics
```
GET    /api/analytics/overview           // Overall stats
GET    /api/analytics/campaigns/:id      // Campaign-specific metrics
GET    /api/analytics/costs              // API cost breakdown
GET    /api/analytics/leads-funnel       // Funnel visualization data
```

### Webhooks
```
POST   /api/webhooks/brevo               // Brevo email events
POST   /api/webhooks/n8n                 // n8n workflow callbacks
```

### Tracking (Public — no auth)
```
GET    /track/open/:draftId              // Email open tracking pixel
GET    /track/click/:draftId             // Click tracking redirect
GET    /unsubscribe/:draftId             // Unsubscribe handler
```

---

## 12. Frontend Pages

### Pages Structure

```
/                           → Dashboard (overview stats)
/campaigns                  → Campaign list
/campaigns/new              → Create campaign
/campaigns/:id              → Campaign detail
/campaigns/:id/leads        → Leads in campaign
/leads                      → All leads list
/leads/:id                  → Lead detail + timeline
/scraping                   → Scraping jobs
/drafts                     → Email drafts pending review
/drafts/:id                 → Draft review page
/analytics                  → Analytics dashboard
/settings                   → Account settings
/settings/integrations      → API keys, Line Notify
/settings/email             → Email templates
```

### Key Components

```typescript
// Dashboard
- StatsCards (total leads, sent, opened, replied, converted)
- RecentActivity feed
- CampaignPerformanceChart (line chart)
- PendingReviewAlert (if drafts waiting)

// Campaign Detail
- CampaignHeader (status, stats)
- LeadFunnelChart
- SequenceTimeline
- LeadsTable (filterable, sortable)

// Lead Detail
- LeadInfo (company, contact)
- EmailTimeline (all emails sent + events)
- AIAnalysis (website analysis result)
- Notes

// Draft Review
- EmailPreview (rendered HTML)
- AIConfidenceIndicator
- EditableContent
- ApproveRejectButtons
- RegenerateButton

// Analytics
- MetricsOverview
- CostBreakdownChart
- LeadFunnelVisualization
- TopPerformingCampaigns
```

---

## 13. SaaS Multi-tenant Architecture

### Tenant Isolation Strategy

```typescript
// Middleware: ทุก request ต้องมี tenant context
async function tenantMiddleware(req, res, next) {
  const user = req.user; // from JWT
  const tenant = await db.tenants.findUnique({ where: { id: user.tenant_id } });
  
  if (!tenant || !tenant.is_active) {
    return res.status(403).json({ error: 'Tenant not active' });
  }
  
  req.tenant = tenant;
  next();
}

// ทุก DB query ต้องมี tenant_id filter เสมอ
// ห้าม query โดยไม่มี WHERE tenant_id = ?
```

### Quota Enforcement

```typescript
async function checkQuota(tenant: Tenant, type: 'email' | 'lead'): Promise<boolean> {
  const startOfMonth = startOfMonth(new Date());
  
  if (type === 'email') {
    const sent = await db.email_drafts.count({
      where: {
        tenant_id: tenant.id,
        status: 'sent',
        sent_at: { gte: startOfMonth }
      }
    });
    return sent < tenant.email_quota_monthly;
  }
  
  if (type === 'lead') {
    const scraped = await db.leads.count({
      where: {
        tenant_id: tenant.id,
        created_at: { gte: startOfMonth }
      }
    });
    return scraped < tenant.lead_quota_monthly;
  }
}
```

### Pricing Plans

```typescript
const PLANS = {
  starter: {
    price_thb: 2990,
    email_quota: 500,
    lead_quota: 500,
    features: ['scraping', 'enrichment', 'email_sending']
  },
  growth: {
    price_thb: 7990,
    email_quota: 2000,
    lead_quota: 2000,
    features: ['scraping', 'enrichment', 'email_sending', 'ai_personalization', 'crm', 'sequences']
  },
  pro: {
    price_thb: 19990,
    email_quota: 10000,
    lead_quota: 10000,
    features: ['all', 'multi_campaign', 'advanced_analytics', 'api_access', 'priority_support']
  }
};
```

---

## 14. Development Phases

### Phase 1: Core Lead Generation (Week 1-2)

**Goal:** ได้ lead list จริงพร้อม email

**Tasks:**
- [ ] Setup PostgreSQL + Prisma schema
- [ ] Implement Google Maps scraper (Playwright)
- [ ] Implement website crawler + email extractor
- [ ] Implement email MX verification
- [ ] Basic REST API (leads CRUD)
- [ ] Simple React frontend (leads table)
- [ ] n8n workflow: Scraping pipeline
- [ ] n8n workflow: Enrichment pipeline

**Deliverable:** กดปุ่มเดียว → ได้รายชื่อบริษัท + email ใน 30 นาที

---

### Phase 2: AI Email + Sending (Week 3-4)

**Goal:** ส่ง personalized cold email ได้จริง

**Tasks:**
- [ ] Implement AI email generator (Claude API)
- [ ] Implement confidence scoring
- [ ] Integrate Brevo API
- [ ] Email tracking (open/click pixel)
- [ ] Brevo webhook handler
- [ ] Line Notify integration
- [ ] Draft review UI
- [ ] n8n workflow: Email sending pipeline
- [ ] n8n workflow: Reply detection

**Deliverable:** ส่ง 50 personalized emails/วัน พร้อม track ผล

---

### Phase 3: CRM + Dashboard (Week 5-6)

**Goal:** มี CRM และ analytics ใช้งานได้จริง

**Tasks:**
- [ ] Lead pipeline UI (kanban or table)
- [ ] Lead detail page + email timeline
- [ ] Campaign management UI
- [ ] Analytics dashboard (charts)
- [ ] Cost tracking
- [ ] Lead scoring
- [ ] Email sequence (multi-step)
- [ ] CSV import

**Deliverable:** ใช้งานได้ครบ end-to-end

---

### Phase 4: SaaS Ready (After first paying customer)

**Goal:** รองรับหลาย tenant ได้

**Tasks:**
- [ ] Multi-tenant auth + isolation
- [ ] Quota enforcement per plan
- [ ] Billing integration (Omise / Stripe)
- [ ] Onboarding flow
- [ ] Email domain warm-up system
- [ ] Public landing page (app.bestsolutionscorp.com)
- [ ] Documentation

---

## 15. Environment Variables

```env
# App
NODE_ENV=production
PORT=3000
APP_URL=https://app.bestsolutionscorp.com
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@host:5432/leadgen_db

# Redis
REDIS_URL=redis://localhost:6379

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Brevo Email
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=hello@bestsolutionscorp.com
BREVO_SENDER_NAME=Best Solutions Corp

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# Line Notify
LINE_NOTIFY_DEFAULT_TOKEN=...

# n8n
N8N_WEBHOOK_URL=https://n8n.bestsolutionscorp.com
N8N_API_KEY=...

# Supabase (Storage)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

---

## 16. Folder Structure

```
leadgen-system/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── campaigns.routes.ts
│   │   │   │   ├── leads.routes.ts
│   │   │   │   ├── drafts.routes.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   ├── scraping.routes.ts
│   │   │   │   └── webhooks.routes.ts
│   │   │   └── middleware/
│   │   │       ├── auth.middleware.ts
│   │   │       ├── tenant.middleware.ts
│   │   │       └── quota.middleware.ts
│   │   ├── ai/
│   │   │   ├── email-generator.ts
│   │   │   └── company-analyzer.ts
│   │   ├── scrapers/
│   │   │   ├── google-maps.scraper.ts
│   │   │   └── website-crawler.ts
│   │   ├── enrichment/
│   │   │   └── email-verifier.ts
│   │   ├── outreach/
│   │   │   ├── sequence-engine.ts
│   │   │   └── email-sender.ts
│   │   ├── notifications/
│   │   │   └── line-notifier.ts
│   │   ├── analytics/
│   │   │   └── metrics.ts
│   │   ├── crm/
│   │   │   └── lead-scorer.ts
│   │   ├── jobs/            # Bull queues
│   │   │   ├── scraping.job.ts
│   │   │   ├── enrichment.job.ts
│   │   │   └── email.job.ts
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Campaigns/
│   │   │   ├── Leads/
│   │   │   ├── Drafts/
│   │   │   ├── Analytics.tsx
│   │   │   └── Settings/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn components
│   │   │   ├── charts/
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── stores/           # Zustand
│   │   └── lib/
│   └── package.json
│
├── n8n-workflows/
│   ├── 01-scraping-pipeline.json
│   ├── 02-enrichment-pipeline.json
│   ├── 03-email-sending.json
│   └── 04-reply-detection.json
│
└── docker-compose.yml        # PostgreSQL + Redis + n8n
```

---

## Quick Start Summary

ลำดับการสร้างที่เหมาะสมที่สุด:

```
1. Setup PostgreSQL + run migrations
2. Backend: Auth + Leads CRUD API
3. n8n: Scraping workflow → test ดึง leads จริง
4. n8n: Enrichment workflow → test หา email จริง
5. Backend: AI Email Generator + Brevo integration
6. n8n: Email sending workflow
7. Frontend: Lead table + Draft review UI
8. Backend: Webhook handler + tracking
9. Frontend: Dashboard + Analytics
10. Multi-tenant + Quota (Phase 4)
```

**เริ่มจาก Step 1-4 ก่อน** → จะได้ lead list + email จริงภายใน 1-2 สัปดาห์ ใช้หา client ได้ทันที ก่อนจะพัฒนาต่อทั้งหมด
