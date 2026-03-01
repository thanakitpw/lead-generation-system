import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Globe, Loader2, Sparkles, Save, CheckCircle2,
  Target, Package, Lightbulb, Link, Facebook, Flame, Zap, Snowflake,
} from 'lucide-react'
import api from '../../lib/api'

const INDUSTRIES = [
  'อาหารและเครื่องดื่ม', 'โรงงานอุตสาหกรรม', 'ร้านค้าปลีก', 'อสังหาริมทรัพย์',
  'สุขภาพและความงาม', 'การศึกษา', 'บริการ IT', 'โลจิสติกส์และขนส่ง',
  'ก่อสร้างและวัสดุ', 'ยานยนต์', 'การเงินและประกัน', 'การท่องเที่ยว',
  'เกษตรกรรม', 'พลังงาน', 'สื่อและโฆษณา', 'SME ทั่วไป',
]

const SIZES = ['SME (1-50 คน)', 'Mid-market (50-500 คน)', 'Enterprise (500+ คน)', 'ทุกขนาด']

type ProfileForm = {
  companyName: string
  companyWebsite: string
  facebookPage: string
  companyDescription: string
  productsServices: string
  valueProposition: string
  targetIndustries: string[]
  targetCustomerSize: string
  targetDescription: string
}

const EMPTY: ProfileForm = {
  companyName: '', companyWebsite: '', facebookPage: '', companyDescription: '',
  productsServices: '', valueProposition: '',
  targetIndustries: [], targetCustomerSize: '', targetDescription: '',
}

function SectionCard({
  step, icon: Icon, iconBg, title, subtitle, children,
}: {
  step: number; icon: any; iconBg: string; title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex-shrink-0">
          {step}
        </div>
        <div className={`p-2 rounded-xl ${iconBg} flex-shrink-0`}>
          <Icon size={15} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-400 font-normal ml-0.5">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all'

export default function BusinessProfilePage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProfileForm>(EMPTY)
  const [extractUrl, setExtractUrl] = useState('')
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['business-profile'],
    queryFn: () => api.get('/business-profile').then((r) => r.data),
  })

  useEffect(() => {
    if (profile) {
      setForm({
        companyName: profile.companyName ?? '',
        companyWebsite: profile.companyWebsite ?? '',
        facebookPage: profile.facebookPage ?? '',
        companyDescription: profile.companyDescription ?? '',
        productsServices: profile.productsServices ?? '',
        valueProposition: profile.valueProposition ?? '',
        targetIndustries: profile.targetIndustries ?? [],
        targetCustomerSize: profile.targetCustomerSize ?? '',
        targetDescription: profile.targetDescription ?? '',
      })
    }
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: () => api.put('/business-profile', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-profile'] })
      setSaveMsg({ type: 'success', text: 'บันทึกเรียบร้อยแล้ว' })
      setTimeout(() => setSaveMsg(null), 3000)
    },
    onError: () => setSaveMsg({ type: 'error', text: 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }),
  })

  const extractMutation = useMutation({
    mutationFn: () => api.post('/business-profile/extract', { url: extractUrl }),
    onSuccess: (res) => {
      const d = res.data
      setForm((f) => ({
        ...f,
        companyName: d.companyName || f.companyName,
        companyDescription: d.companyDescription || f.companyDescription,
        productsServices: d.productsServices || f.productsServices,
        valueProposition: d.valueProposition || f.valueProposition,
        targetIndustries: d.targetIndustries?.length ? d.targetIndustries : f.targetIndustries,
        targetCustomerSize: d.targetCustomerSize || f.targetCustomerSize,
        targetDescription: d.targetDescription || f.targetDescription,
      }))
      setExtractUrl('')
    },
  })

  const toggleIndustry = (ind: string) => {
    setForm((f) => ({
      ...f,
      targetIndustries: f.targetIndustries.includes(ind)
        ? f.targetIndustries.filter((i) => i !== ind)
        : [...f.targetIndustries, ind],
    }))
  }

  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const completionFields = [
    form.companyName, form.companyDescription, form.productsServices,
    form.valueProposition, form.targetIndustries.length > 0, form.targetCustomerSize,
  ]
  const completionPct = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">โปรไฟล์บริษัท</h1>
          <p className="text-sm text-gray-500 mt-0.5">ข้อมูลนี้ใช้ให้ AI วิเคราะห์และ score leads ให้ตรงกับธุรกิจของคุณ</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.companyName}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40 shadow-sm"
        >
          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึก
        </button>
      </div>

      {saveMsg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl mb-5 ${
          saveMsg.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <CheckCircle2 size={14} />
          {saveMsg.text}
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* LEFT: Form (2/3 width) */}
        <div className="xl:col-span-2 space-y-5">

          {/* AI Auto-fill — subtle style */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-50">
                <Sparkles size={14} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Auto-fill ด้วย AI</p>
                <p className="text-xs text-gray-400">ใส่ URL เว็บไซต์หรือ Facebook — AI จะกรอกทุก field ให้อัตโนมัติ</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && extractUrl && !extractMutation.isPending && extractMutation.mutate()}
                  placeholder="https://yourcompany.com หรือ https://facebook.com/yourpage"
                  className={`${inputCls} pl-9`}
                />
              </div>
              <button
                onClick={() => extractMutation.mutate()}
                disabled={extractMutation.isPending || !extractUrl}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {extractMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> วิเคราะห์...</>
                  : <><Sparkles size={13} /> Auto-fill</>}
              </button>
            </div>
            {extractMutation.isPending && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-xs text-amber-600 font-medium">AI กำลังอ่านเนื้อหาจากเว็บไซต์... ประมาณ 10-20 วินาที</p>
              </div>
            )}
            {extractMutation.isSuccess && (
              <p className="flex items-center gap-1.5 text-xs text-green-700 font-medium mt-2.5">
                <CheckCircle2 size={12} /> กรอกข้อมูลเรียบร้อยแล้ว — ตรวจสอบและบันทึกได้เลย
              </p>
            )}
            {extractMutation.isError && (
              <p className="text-xs text-red-500 mt-2">ไม่สามารถดึงข้อมูลจาก URL นี้ได้ กรุณาลองใหม่หรือกรอกเอง</p>
            )}
          </div>

          {/* Section 1: Basic Info */}
          <SectionCard step={1} icon={Building2} iconBg="bg-blue-50 text-blue-600" title="ข้อมูลพื้นฐาน" subtitle="ชื่อบริษัท เว็บไซต์ และคำอธิบายธุรกิจ">
            <Field label="ชื่อบริษัท" required>
              <input value={form.companyName} onChange={set('companyName')} placeholder="เช่น Best Solutions Co., Ltd." className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="เว็บไซต์">
                <div className="relative">
                  <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://yourcompany.com" className={`${inputCls} pl-9`} />
                </div>
              </Field>
              <Field label="Facebook Page">
                <div className="relative">
                  <Facebook size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.facebookPage} onChange={set('facebookPage')} placeholder="facebook.com/page" className={`${inputCls} pl-9`} />
                </div>
              </Field>
            </div>
            <Field label="อธิบายธุรกิจ" hint="— AI จะใช้สร้างอีเมลที่ personalized">
              <textarea
                value={form.companyDescription}
                onChange={set('companyDescription')}
                rows={3}
                placeholder="เช่น เราเป็นบริษัท AI automation สำหรับ SME ไทย ช่วยลดเวลางานซ้ำซากและเพิ่ม efficiency ให้ธุรกิจ"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </SectionCard>

          {/* Section 2: Products & Value */}
          <SectionCard step={2} icon={Package} iconBg="bg-purple-50 text-purple-600" title="สินค้า / บริการ" subtitle="สิ่งที่คุณขายและจุดแข็งที่ทำให้แตกต่าง">
            <Field label="สินค้าหรือบริการหลัก">
              <textarea
                value={form.productsServices}
                onChange={set('productsServices')}
                rows={3}
                placeholder={"เช่น\n- ระบบ AI Chatbot สำหรับ Customer Service\n- Automation workflow สำหรับ HR\n- ระบบวิเคราะห์ข้อมูลด้วย AI"}
                className={`${inputCls} resize-none`}
              />
            </Field>
            <Field label="จุดแข็ง / Value Proposition">
              <textarea
                value={form.valueProposition}
                onChange={set('valueProposition')}
                rows={2}
                placeholder="เช่น ลด cost ได้ 40% ภายใน 3 เดือน, ทีม support ภาษาไทย 24/7, ติดตั้งได้ใน 2 สัปดาห์"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </SectionCard>

          {/* Section 3: Target Customer */}
          <SectionCard step={3} icon={Target} iconBg="bg-green-50 text-green-600" title="กลุ่มลูกค้าเป้าหมาย" subtitle="AI จะใช้ข้อมูลนี้ score leads ว่า HOT/WARM/COLD">
            <Field label="อุตสาหกรรมที่สนใจ" hint="(เลือกได้หลายอย่าง)">
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => toggleIndustry(ind)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.targetIndustries.includes(ind)
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="ขนาดบริษัทที่สนใจ">
              <div className="grid grid-cols-2 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, targetCustomerSize: f.targetCustomerSize === s ? '' : s }))}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                      form.targetCustomerSize === s
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="รายละเอียดเพิ่มเติม" hint="(optional)">
              <textarea
                value={form.targetDescription}
                onChange={set('targetDescription')}
                rows={2}
                placeholder="เช่น บริษัทที่มีทีม sales มากกว่า 5 คน, ธุรกิจที่ขายสินค้า online, มีงบ IT มากกว่า 50,000 บาท/เดือน"
                className={`${inputCls} resize-none`}
              />
            </Field>
          </SectionCard>

          {/* Save Button (bottom of form) */}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.companyName}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-40 shadow-sm"
          >
            {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            บันทึกโปรไฟล์
          </button>
        </div>

        {/* RIGHT: Sticky Sidebar (1/3 width) */}
        <div className="xl:col-span-1 space-y-4 xl:sticky xl:top-6">

          {/* Completion */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">ความสมบูรณ์</span>
              <span className={`text-sm font-bold ${completionPct === 100 ? 'text-green-600' : 'text-gray-900'}`}>{completionPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-green-500' : 'bg-gray-900'}`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="space-y-2">
              {[
                { label: 'ชื่อบริษัท', done: !!form.companyName },
                { label: 'อธิบายธุรกิจ', done: !!form.companyDescription },
                { label: 'สินค้า/บริการ', done: !!form.productsServices },
                { label: 'Value Proposition', done: !!form.valueProposition },
                { label: 'อุตสาหกรรม', done: form.targetIndustries.length > 0 },
                { label: 'ขนาดลูกค้า', done: !!form.targetCustomerSize },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {done && <CheckCircle2 size={10} className="text-green-600" />}
                  </div>
                  <span className={`text-xs ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Scoring Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gray-50">
                <Lightbulb size={13} className="text-gray-500" />
              </div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI Lead Scoring</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                เมื่อ scraping ดึง lead มา AI จะเปรียบเทียบกับโปรไฟล์นี้และให้คะแนน 0–100
              </p>
              <div className="space-y-2">
                {[
                  { icon: Flame, label: 'HOT', range: '70–100', bg: 'bg-red-50', text: 'text-red-600', desc: 'ตรงกับ target มาก' },
                  { icon: Zap, label: 'WARM', range: '40–69', bg: 'bg-amber-50', text: 'text-amber-600', desc: 'มีโอกาสปิดได้' },
                  { icon: Snowflake, label: 'COLD', range: '0–39', bg: 'bg-blue-50', text: 'text-blue-500', desc: 'ไม่ตรง target' },
                ].map(({ icon: Icon, label, range, bg, text, desc }) => (
                  <div key={label} className={`flex items-center gap-3 ${bg} rounded-xl px-3 py-2.5`}>
                    <Icon size={14} className={text} />
                    <div className="flex-1">
                      <span className={`text-xs font-bold ${text}`}>{label}</span>
                      <span className="text-[10px] text-gray-400 ml-1.5">{desc}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400">{range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Tips</p>
            <ul className="space-y-1.5 text-xs text-gray-500 leading-relaxed">
              <li className="flex gap-1.5"><span className="text-gray-300 flex-shrink-0">·</span>ยิ่งกรอกข้อมูลครบ AI scoring ยิ่งแม่นยำ</li>
              <li className="flex gap-1.5"><span className="text-gray-300 flex-shrink-0">·</span>ใช้ Auto-fill กับเว็บบริษัทเพื่อประหยัดเวลา</li>
              <li className="flex gap-1.5"><span className="text-gray-300 flex-shrink-0">·</span>อัปเดตโปรไฟล์ได้ทุกเมื่อ AI จะใช้ข้อมูลล่าสุด</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
