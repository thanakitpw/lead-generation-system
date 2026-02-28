import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, Pause, Search, Loader2, Mail } from 'lucide-react'
import api from '../../lib/api'

const STATUS_LABEL: Record<string, string> = {
  NEW: 'ใหม่',
  ENRICHED: 'มีอีเมล',
  SELECTED: 'เลือกแล้ว',
  EMAILED: 'ส่งแล้ว',
  OPENED: 'เปิดอ่าน',
  CLICKED: 'คลิก',
  REPLIED: 'ตอบกลับ',
  CONVERTED: 'ปิดได้',
  UNSUBSCRIBED: 'ยกเลิก',
  BOUNCED: 'ส่งไม่ได้',
}

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  ENRICHED: 'bg-blue-100 text-blue-700',
  SELECTED: 'bg-amber-100 text-amber-700',
  EMAILED: 'bg-green-100 text-green-700',
  OPENED: 'bg-emerald-100 text-emerald-700',
  CLICKED: 'bg-teal-100 text-teal-700',
  REPLIED: 'bg-purple-100 text-purple-700',
  CONVERTED: 'bg-indigo-100 text-indigo-700',
  UNSUBSCRIBED: 'bg-red-100 text-red-600',
  BOUNCED: 'bg-red-100 text-red-600',
}

type TabFilter = 'ALL' | 'READY' | 'SELECTED' | 'EMAILED'

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scrapingForm, setScrapingForm] = useState({ keywords: '', location: '', maxResults: 100 })
  const [scrapingMsg, setScrapingMsg] = useState('')
  const [tab, setTab] = useState<TabFilter>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMsg, setSelectMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
  })

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', { campaign_id: id }],
    queryFn: () => api.get('/leads', { params: { campaign_id: id, limit: 100 } }).then((r) => r.data),
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

  const selectMutation = useMutation({
    mutationFn: (leadIds: string[]) => api.post('/leads/select', { leadIds, campaignId: id }),
    onSuccess: (res) => {
      setSelectedIds(new Set())
      setSelectMsg(`✅ เลือก ${res.data.selected} lead แล้ว — กำลังสร้าง Draft ภายใน 5 นาที`)
      queryClient.invalidateQueries({ queryKey: ['leads', { campaign_id: id }] })
      setTimeout(() => navigate('/drafts'), 1500)
    },
    onError: () => setSelectMsg('❌ เลือก lead ไม่สำเร็จ'),
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

  const handleSelectForEmail = () => {
    if (selectedIds.size === 0) return
    selectMutation.mutate(Array.from(selectedIds))
  }

  const toggleLead = (leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
  if (!data) return <div className="text-center py-12 text-gray-400">ไม่พบแคมเปญ</div>

  const campaign = data
  const allLeads: any[] = leadsData?.data ?? []
  const isActive = campaign.status === 'ACTIVE'

  const filteredLeads = allLeads.filter((lead) => {
    if (tab === 'READY') return lead.email && (lead.status === 'NEW' || lead.status === 'ENRICHED')
    if (tab === 'SELECTED') return lead.status === 'SELECTED'
    if (tab === 'EMAILED') return ['EMAILED', 'OPENED', 'CLICKED', 'REPLIED', 'CONVERTED'].includes(lead.status)
    return true
  })

  const readyCount = allLeads.filter((l) => l.email && (l.status === 'NEW' || l.status === 'ENRICHED')).length
  const selectedCount = allLeads.filter((l) => l.status === 'SELECTED').length
  const emailedCount = allLeads.filter((l) => ['EMAILED', 'OPENED', 'CLICKED', 'REPLIED', 'CONVERTED'].includes(l.status)).length

  const canSelectLead = (lead: any) => lead.email && (lead.status === 'NEW' || lead.status === 'ENRICHED')

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'ทั้งหมด', count: allLeads.length },
    { key: 'READY', label: 'พร้อมเลือก', count: readyCount },
    { key: 'SELECTED', label: 'เลือกแล้ว', count: selectedCount },
    { key: 'EMAILED', label: 'ส่งแล้ว', count: emailedCount },
  ]

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Leads ({leadsData?.pagination?.total ?? 0})</h2>
          {selectedIds.size > 0 && (
            <button
              onClick={handleSelectForEmail}
              disabled={selectMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {selectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              สร้างอีเมล ({selectedIds.size} lead)
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-4 border-b border-gray-100">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelectedIds(new Set()) }}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors ${
                tab === key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label} {count > 0 && <span className="ml-1 text-gray-400">({count})</span>}
            </button>
          ))}
        </div>

        {selectMsg && (
          <div className="mb-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{selectMsg}</div>
        )}

        {leadsLoading ? (
          <div className="text-center py-6 text-gray-400 text-sm">กำลังโหลด leads...</div>
        ) : filteredLeads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {tab === 'ALL' ? 'ยังไม่มี Leads — เริ่ม Scraping ก่อน' :
             tab === 'READY' ? 'ยังไม่มี lead ที่มีอีเมลและพร้อมเลือก' :
             tab === 'SELECTED' ? 'ยังไม่มี lead ที่เลือกสำหรับส่งอีเมล' :
             'ยังไม่มี lead ที่ส่งอีเมลแล้ว'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 w-8">
                    {(tab === 'ALL' || tab === 'READY') && (
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={
                          filteredLeads.filter(canSelectLead).length > 0 &&
                          filteredLeads.filter(canSelectLead).every((l) => selectedIds.has(l.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredLeads.filter(canSelectLead).map((l) => l.id)))
                          } else {
                            setSelectedIds(new Set())
                          }
                        }}
                      />
                    )}
                  </th>
                  <th className="pb-2 font-medium text-gray-500">บริษัท</th>
                  <th className="pb-2 font-medium text-gray-500">อีเมล</th>
                  <th className="pb-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 ${
                      selectedIds.has(lead.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="py-2.5">
                      {canSelectLead(lead) && (
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                        />
                      )}
                    </td>
                    <td className="py-2.5 font-medium text-gray-800">{lead.companyName}</td>
                    <td className="py-2.5 text-gray-500">{lead.email ?? <span className="text-gray-300">—</span>}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[lead.status] ?? lead.status}
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
