import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../lib/api'

const THAI_LOCATIONS = [
  'กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร',
  'นครปฐม', 'เชียงใหม่', 'เชียงราย', 'ลำปาง', 'ลำพูน', 'แม่ฮ่องสอน',
  'ขอนแก่น', 'อุดรธานี', 'นครราชสีมา', 'อุบลราชธานี', 'บึงกาฬ',
  'สกลนคร', 'หนองคาย', 'มุกดาหาร', 'ร้อยเอ็ด', 'มหาสารคาม',
  'ชลบุรี', 'ระยอง', 'พัทยา', 'จันทบุรี', 'ตราด',
  'สุราษฎร์ธานี', 'ภูเก็ต', 'นครศรีธรรมราช', 'สงขลา', 'หาดใหญ่',
  'กระบี่', 'พังงา', 'ตรัง', 'สตูล', 'ปัตตานี',
  'พิษณุโลก', 'สุโขทัย', 'อุตรดิตถ์', 'แพร่', 'น่าน',
  'Bangkok, Thailand', 'Chiang Mai, Thailand', 'Phuket, Thailand',
]

interface CampaignForm {
  name: string
  targetLocation: string
  targetKeywords: string
  targetIndustry: string
  senderName: string
  senderEmail: string
  replyToEmail: string
  dailySendLimit: number
  confidenceThreshold: number
  systemPrompt: string
}

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CampaignForm | null>(null)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
  })

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        targetLocation: data.targetLocation ?? '',
        targetKeywords: (data.targetKeywords ?? []).join(', '),
        targetIndustry: data.targetIndustry ?? '',
        senderName: data.senderName ?? '',
        senderEmail: data.senderEmail ?? '',
        replyToEmail: data.replyToEmail ?? '',
        dailySendLimit: data.dailySendLimit ?? 50,
        confidenceThreshold: data.confidenceThreshold ?? 0.75,
        systemPrompt: data.systemPrompt ?? '',
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put(`/campaigns/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      navigate(`/campaigns/${id}`)
    },
    onError: (err: any) => setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    setError('')
    mutation.mutate({
      name: form.name,
      targetLocation: form.targetLocation,
      targetKeywords: form.targetKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      targetIndustry: form.targetIndustry || undefined,
      senderName: form.senderName || undefined,
      senderEmail: form.senderEmail || undefined,
      replyToEmail: form.replyToEmail || undefined,
      dailySendLimit: form.dailySendLimit,
      confidenceThreshold: form.confidenceThreshold,
      systemPrompt: form.systemPrompt || undefined,
    })
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">กำลังโหลด...</span>
        </div>
      </div>
    )
  }

  const field = (label: string, key: keyof CampaignForm, type = 'text', hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type={type}
        value={String(form[key])}
        onChange={(e) => setForm((f) => f ? ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }) : f)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">แก้ไขแคมเปญ</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">ข้อมูลทั่วไป</h2>
          <div className="space-y-4">
            {field('ชื่อแคมเปญ *', 'name')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <p className="text-xs text-gray-400 mb-1">เลือกจากรายการหรือพิมพ์เอง</p>
              <input
                list="location-list-edit"
                value={form.targetLocation}
                onChange={(e) => setForm((f) => f ? ({ ...f, targetLocation: e.target.value }) : f)}
                placeholder="เช่น กรุงเทพมหานคร, เชียงใหม่"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <datalist id="location-list-edit">
                {THAI_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            {field('Keywords', 'targetKeywords', 'text', 'คั่นด้วยคอมม่า เช่น โรงงานอาหาร, food factory')}
            {field('Industry (optional)', 'targetIndustry')}
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            <span>ตั้งค่าขั้นสูง (อีเมล & AI)</span>
            {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-5 border-t border-gray-100 pt-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-4">การตั้งค่าการส่งอีเมล</h2>
                <div className="space-y-4">
                  {field('ชื่อผู้ส่ง', 'senderName')}
                  {field('อีเมลผู้ส่ง', 'senderEmail', 'email')}
                  {field('Reply-To Email', 'replyToEmail', 'email')}
                  <div className="grid grid-cols-2 gap-4">
                    {field('Daily Send Limit', 'dailySendLimit', 'number')}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confidence Threshold
                        <span className="ml-2 text-xs text-gray-400">({Math.round(form.confidenceThreshold * 100)}%)</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={form.confidenceThreshold}
                        onChange={(e) => setForm((f) => f ? ({ ...f, confidenceThreshold: Number(e.target.value) }) : f)}
                        className="w-full mt-2"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>50%</span><span>75%</span><span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1">AI System Prompt</h2>
                <p className="text-xs text-gray-400 mb-2">อธิบายว่าเราเสนออะไร และ AI ควรเน้นอะไรในอีเมล</p>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => setForm((f) => f ? ({ ...f, systemPrompt: e.target.value }) : f)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="เช่น เราเป็นบริษัทที่ให้บริการ AI automation สำหรับ SME ไทย..."
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !form.name}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  )
}
