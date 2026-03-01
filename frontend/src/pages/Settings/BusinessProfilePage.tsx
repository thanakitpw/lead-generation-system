import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Globe, Loader2, Sparkles, Save, CheckCircle2,
  Target, Package, Lightbulb, Users, ChevronDown, ChevronUp, Link,
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

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="p-2 rounded-xl bg-primary-50">
          <Icon size={15} className="text-primary-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {hint && <span className="ml-1.5 text-gray-400 font-normal">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow'

export default function BusinessProfilePage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProfileForm>(EMPTY)
  const [extractUrl, setExtractUrl] = useState('')
  const [showExtract, setShowExtract] = useState(false)
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
      setShowExtract(false)
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

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">โปรไฟล์บริษัท</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI จะใช้ข้อมูลนี้วิเคราะห์ว่า lead ไหน potential สูงสำหรับธุรกิจของคุณ
          </p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.companyName}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึก
        </button>
      </div>

      {saveMsg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
          saveMsg.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <CheckCircle2 size={14} />
          {saveMsg.text}
        </div>
      )}

      {/* AI Extract from URL */}
      <div className="card p-4">
        <button
          onClick={() => setShowExtract((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50">
              <Sparkles size={14} className="text-amber-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">ให้ AI กรอกข้อมูลอัตโนมัติจากเว็บไซต์</p>
              <p className="text-xs text-gray-400">ใส่ URL เว็บไซต์หรือ Facebook Page แล้ว AI จะดึงข้อมูลให้</p>
            </div>
          </div>
          {showExtract ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>

        {showExtract && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  placeholder="https://yourcompany.com หรือ https://facebook.com/yourpage"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => extractMutation.mutate()}
                disabled={extractMutation.isPending || !extractUrl}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {extractMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> กำลังวิเคราะห์...</>
                ) : (
                  <><Sparkles size={14} /> Extract</>
                )}
              </button>
            </div>
            {extractMutation.isError && (
              <p className="text-xs text-red-500 mt-2">ไม่สามารถดึงข้อมูลจาก URL นี้ได้ กรุณาลองใหม่หรือกรอกเอง</p>
            )}
            {extractMutation.isPending && (
              <p className="text-xs text-amber-600 mt-2">AI กำลังอ่านเนื้อหาจากเว็บไซต์... อาจใช้เวลา 10-20 วินาที</p>
            )}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Section icon={Building2} title="ข้อมูลพื้นฐาน">
        <Field label="ชื่อบริษัท" hint="*">
          <input value={form.companyName} onChange={set('companyName')} placeholder="เช่น Best Solutions Co., Ltd." className={inputCls} />
        </Field>
        <Field label="เว็บไซต์">
          <input value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://yourcompany.com" className={inputCls} />
        </Field>
        <Field label="Facebook Page">
          <input value={form.facebookPage} onChange={set('facebookPage')} placeholder="https://facebook.com/yourpage" className={inputCls} />
        </Field>
        <Field label="อธิบายธุรกิจ" hint="(AI จะใช้สร้างอีเมล)">
          <textarea
            value={form.companyDescription}
            onChange={set('companyDescription')}
            rows={3}
            placeholder="เช่น เราเป็นบริษัท AI automation สำหรับ SME ไทย ช่วยลดเวลางานซ้ำซากลง 80%"
            className={`${inputCls} resize-none`}
          />
        </Field>
      </Section>

      {/* Products & Value */}
      <Section icon={Package} title="สินค้า / บริการ">
        <Field label="สินค้าหรือบริการหลัก">
          <textarea
            value={form.productsServices}
            onChange={set('productsServices')}
            rows={3}
            placeholder="เช่น - ระบบ AI Chatbot สำหรับ Customer Service&#10;- Automation workflow สำหรับ HR&#10;- ระบบวิเคราะห์ข้อมูลด้วย AI"
            className={`${inputCls} resize-none`}
          />
        </Field>
        <Field label="จุดแข็ง / Value Proposition">
          <textarea
            value={form.valueProposition}
            onChange={set('valueProposition')}
            rows={2}
            placeholder="เช่น ลด cost ได้ 40% ภายใน 3 เดือน, ทีม support ภาษาไทย 24/7"
            className={`${inputCls} resize-none`}
          />
        </Field>
      </Section>

      {/* Target Customer */}
      <Section icon={Target} title="กลุ่มลูกค้าเป้าหมาย">
        <Field label="อุตสาหกรรมที่สนใจ" hint="(เลือกได้หลายอย่าง)">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.targetIndustries.includes(ind)
                    ? 'bg-primary-100 text-primary-700 border-primary-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </Field>
        <Field label="ขนาดบริษัทที่สนใจ">
          <div className="flex gap-2 flex-wrap">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, targetCustomerSize: f.targetCustomerSize === s ? '' : s }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.targetCustomerSize === s
                    ? 'bg-primary-100 text-primary-700 border-primary-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
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
            placeholder="เช่น บริษัทที่มีทีม sales มากกว่า 5 คน, ธุรกิจที่ขายสินค้า online"
            className={`${inputCls} resize-none`}
          />
        </Field>
      </Section>

      {/* AI Score Preview */}
      <div className="card p-5 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <Lightbulb size={15} className="text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">AI Lead Scoring ทำงานอย่างไร?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              เมื่อ scraping ดึง lead มา AI จะเปรียบเทียบข้อมูล lead กับโปรไฟล์บริษัทของคุณ แล้วให้คะแนน 0-100
              พร้อม tier: <span className="font-semibold text-red-600">HOT</span> (70+),{' '}
              <span className="font-semibold text-amber-600">WARM</span> (40-69),{' '}
              <span className="font-semibold text-gray-500">COLD</span> (&lt;40)
              เพื่อให้คุณโฟกัสที่ lead ที่มี potential สูงก่อน
            </p>
          </div>
        </div>
      </div>

      <div className="pb-4">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.companyName}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
        >
          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          บันทึกโปรไฟล์
        </button>
      </div>
    </div>
  )
}
