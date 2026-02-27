import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import api from '../../lib/api'

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

export default function NewCampaignPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    targetLocation: 'Bangkok, Thailand',
    targetKeywords: '',
    targetIndustry: '',
    senderName: '',
    senderEmail: '',
    replyToEmail: '',
    dailySendLimit: 50,
    confidenceThreshold: 0.75,
    systemPrompt: '',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/campaigns', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      navigate(`/campaigns/${res.data.id}`)
    },
    onError: (err: any) => setError(err.response?.data?.error || 'เกิดข้อผิดพลาด'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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

  const field = (label: string, key: keyof CampaignForm, type = 'text', hint?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type={type}
        value={String(form[key])}
        onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
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
        <h1 className="text-xl font-semibold text-gray-900">สร้างแคมเปญใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">ข้อมูลทั่วไป</h2>
          <div className="space-y-4">
            {field('ชื่อแคมเปญ *', 'name')}
            {field('Location', 'targetLocation', 'text', 'เช่น Bangkok, Thailand หรือ เชียงใหม่')}
            {field('Keywords', 'targetKeywords', 'text', 'คั่นด้วยคอมม่า เช่น โรงงานอาหาร, food factory')}
            {field('Industry (optional)', 'targetIndustry')}
          </div>
        </div>

        <hr className="border-gray-100" />

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
                  onChange={(e) => setForm((f) => ({ ...f, confidenceThreshold: Number(e.target.value) }))}
                  className="w-full mt-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>50%</span><span>75% (default)</span><span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">AI System Prompt</h2>
          <p className="text-xs text-gray-400 mb-2">อธิบายว่าเราเสนออะไร และ AI ควรเน้นอะไรในอีเมล</p>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="เช่น เราเป็นบริษัทที่ให้บริการ AI automation สำหรับ SME ไทย ช่วยลดเวลาทำงานซ้ำซากลง 80%..."
          />
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
            {mutation.isPending ? 'กำลังสร้าง...' : 'สร้างแคมเปญ'}
          </button>
        </div>
      </form>
    </div>
  )
}
