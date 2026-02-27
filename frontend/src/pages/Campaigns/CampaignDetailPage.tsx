import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, Pause, Search, Loader2 } from 'lucide-react'
import api from '../../lib/api'

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scrapingForm, setScrapingForm] = useState({ keywords: '', location: '', maxResults: 100 })
  const [scrapingMsg, setScrapingMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
  })

  const { data: leadsData } = useQuery({
    queryKey: ['leads', { campaign_id: id }],
    queryFn: () => api.get('/leads', { params: { campaign_id: id, limit: 20 } }).then((r) => r.data),
  })

  const startMutation = useMutation({
    mutationFn: () => api.put(`/campaigns/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  })

  const pauseMutation = useMutation({
    mutationFn: () => api.put(`/campaigns/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', id] }),
  })

  const scrapeMutation = useMutation({
    mutationFn: (payload: object) => api.post('/scraping/start', payload),
    onSuccess: (res) => setScrapingMsg(`✅ เริ่ม scraping แล้ว (Job ID: ${res.data.jobId})`),
    onError: () => setScrapingMsg('❌ เริ่ม scraping ไม่สำเร็จ'),
  })

  const handleScrape = () => {
    if (!scrapingForm.keywords || !scrapingForm.location) return
    scrapeMutation.mutate({
      campaignId: id,
      keywords: scrapingForm.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      location: scrapingForm.location,
      maxResults: scrapingForm.maxResults,
    })
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
  if (!data) return <div className="text-center py-12 text-gray-400">ไม่พบแคมเปญ</div>

  const campaign = data
  const leads = leadsData?.data ?? []
  const isActive = campaign.status === 'ACTIVE'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{campaign.name}</h1>
            <p className="text-sm text-gray-400">
              {campaign.targetLocation} · {campaign.targetKeywords?.join(', ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isActive ? (
            <button
              onClick={() => pauseMutation.mutate()}
              className="flex items-center gap-2 text-sm text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Pause size={14} /> หยุดชั่วคราว
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              className="flex items-center gap-2 text-sm text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
            >
              <Play size={14} /> เริ่มแคมเปญ
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Leads', value: campaign.statsTotalLeads },
          { label: 'ส่งแล้ว', value: campaign.statsEmailsSent },
          { label: 'เปิดอ่าน', value: campaign.statsEmailsOpened },
          { label: 'ตอบกลับ', value: campaign.statsEmailsReplied },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Search size={14} /> เริ่ม Scraping Leads ใหม่
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Keywords (คั่นด้วย ,)</label>
            <input
              value={scrapingForm.keywords}
              onChange={(e) => setScrapingForm((f) => ({ ...f, keywords: e.target.value }))}
              placeholder="โรงงานอาหาร, food factory"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Results</label>
            <input
              type="number"
              value={scrapingForm.maxResults}
              onChange={(e) => setScrapingForm((f) => ({ ...f, maxResults: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
          <input
            value={scrapingForm.location}
            onChange={(e) => setScrapingForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Bangkok, Thailand"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={scrapeMutation.isPending || !scrapingForm.keywords || !scrapingForm.location}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {scrapeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          เริ่ม Scraping
        </button>
        {scrapingMsg && <p className="text-sm mt-2 text-gray-600">{scrapingMsg}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads ({leadsData?.pagination?.total ?? 0})</h2>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">ยังไม่มี Leads — เริ่ม Scraping ก่อน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 font-medium text-gray-500">บริษัท</th>
                  <th className="pb-2 font-medium text-gray-500">อีเมล</th>
                  <th className="pb-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-800">{lead.companyName}</td>
                    <td className="py-2.5 text-gray-500">{lead.email ?? '—'}</td>
                    <td className="py-2.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
