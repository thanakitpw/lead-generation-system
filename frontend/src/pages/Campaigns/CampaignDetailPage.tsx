import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Play, Pause, Search, Loader2, Mail, Users,
  Send, Eye, MessageSquare, MapPin, Globe, Phone, Star, ChevronRight,
} from 'lucide-react'
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

const CAMPAIGN_STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  DRAFT:     { label: 'Draft',     dot: 'bg-gray-400' },
  ACTIVE:    { label: 'Active',    dot: 'bg-green-500' },
  PAUSED:    { label: 'Paused',    dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-500' },
  ARCHIVED:  { label: 'Archived',  dot: 'bg-gray-300' },
}

type TabFilter = 'ALL' | 'READY' | 'SELECTED' | 'EMAILED'

function CompanyAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-teal-100 text-teal-700',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials || '?'}
    </div>
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scrapingForm, setScrapingForm] = useState({ keywords: '', location: '', maxResults: 100 })
  const [scrapingMsg, setScrapingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<TabFilter>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMsg, setSelectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
  })

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', { campaign_id: id }],
    queryFn: () => api.get('/leads', { params: { campaign_id: id, limit: 200 } }).then((r) => r.data),
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
    onSuccess: (res) => setScrapingMsg({ type: 'success', text: `เริ่ม Scraping แล้ว — Job ID: ${res.data.jobId}` }),
    onError: () => setScrapingMsg({ type: 'error', text: 'เริ่ม Scraping ไม่สำเร็จ กรุณาลองใหม่' }),
  })

  const selectMutation = useMutation({
    mutationFn: (leadIds: string[]) => api.post('/leads/select', { leadIds, campaignId: id }),
    onSuccess: (res) => {
      setSelectedIds(new Set())
      setSelectMsg({ type: 'success', text: `เลือก ${res.data.selected} lead แล้ว — กำลังสร้าง Draft ภายใน 5 นาที` })
      queryClient.invalidateQueries({ queryKey: ['leads', { campaign_id: id }] })
      setTimeout(() => navigate('/drafts'), 1500)
    },
    onError: () => setSelectMsg({ type: 'error', text: 'เลือก lead ไม่สำเร็จ' }),
  })

  const handleScrape = () => {
    if (!scrapingForm.keywords || !scrapingForm.location) return
    setScrapingMsg(null)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">กำลังโหลด...</span>
        </div>
      </div>
    )
  }
  if (!data) return <div className="text-center py-12 text-gray-400 text-sm">ไม่พบแคมเปญ</div>

  const campaign = data
  const allLeads: any[] = leadsData?.data ?? []
  const isActive = campaign.status === 'ACTIVE'
  const statusConfig = CAMPAIGN_STATUS_CONFIG[campaign.status] ?? { label: campaign.status, dot: 'bg-gray-400' }

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

  const statCards = [
    { label: 'Leads ทั้งหมด', value: campaign.statsTotalLeads, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'อีเมลส่งแล้ว', value: campaign.statsEmailsSent, icon: Send, color: 'text-green-600 bg-green-50' },
    { label: 'เปิดอ่าน', value: campaign.statsEmailsOpened, icon: Eye, color: 'text-amber-600 bg-amber-50' },
    { label: 'ตอบกลับ', value: campaign.statsEmailsReplied, icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  ]

  const emptyMessages: Record<TabFilter, string> = {
    ALL: 'ยังไม่มี Leads — เริ่ม Scraping ด้านบนก่อน',
    READY: 'ยังไม่มี Lead ที่มีอีเมลและพร้อมเลือก',
    SELECTED: 'ยังไม่มี Lead ที่เลือกสำหรับส่งอีเมล',
    EMAILED: 'ยังไม่มี Lead ที่ส่งอีเมลแล้ว',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{campaign.name}</h1>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              {campaign.targetLocation && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {campaign.targetLocation}
                </span>
              )}
              {campaign.targetKeywords?.length > 0 && (
                <span className="flex items-center gap-1">
                  <Search size={12} />
                  {campaign.targetKeywords.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="flex items-center gap-2 text-sm font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {pauseMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
              หยุดชั่วคราว
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {startMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              เริ่มแคมเปญ
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={16} />
              </div>
              <span className="text-xs font-medium text-gray-400 bg-surface-100 px-2 py-1 rounded-lg">รวม</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value ?? 0}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Scraping Panel */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-50">
            <Search size={14} className="text-primary-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">ค้นหา Leads ใหม่จาก Google Maps</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Keywords <span className="text-gray-400 font-normal">(คั่นด้วยจุลภาค)</span>
              </label>
              <input
                value={scrapingForm.keywords}
                onChange={(e) => setScrapingForm((f) => ({ ...f, keywords: e.target.value }))}
                placeholder="เช่น โรงงานอาหาร, food factory, ร้านอาหาร"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">จำนวนสูงสุด</label>
              <input
                type="number"
                min={1}
                max={200}
                value={scrapingForm.maxResults}
                onChange={(e) => setScrapingForm((f) => ({ ...f, maxResults: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">สถานที่</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={scrapingForm.location}
                onChange={(e) => setScrapingForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="เช่น Bangkok, Thailand หรือ กรุงเทพมหานคร"
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleScrape}
              disabled={scrapeMutation.isPending || !scrapingForm.keywords || !scrapingForm.location}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {scrapeMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  กำลังเริ่ม...
                </>
              ) : (
                <>
                  <Search size={14} />
                  เริ่ม Scraping
                </>
              )}
            </button>
            {scrapingMsg && (
              <span className={`text-sm flex items-center gap-1.5 ${
                scrapingMsg.type === 'success' ? 'text-green-600' : 'text-red-500'
              }`}>
                {scrapingMsg.type === 'success' ? '✓' : '✕'} {scrapingMsg.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gray-50">
              <Users size={14} className="text-gray-500" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">
              Leads
              {leadsData?.pagination?.total != null && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {leadsData.pagination.total} รายการ
                </span>
              )}
            </h2>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleSelectForEmail}
              disabled={selectMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {selectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              สร้างอีเมล
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{selectedIds.size}</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-5 flex gap-0 border-b border-gray-100">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelectedIds(new Set()) }}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'text-primary-600 border-primary-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  tab === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert messages */}
        {selectMsg && (
          <div className={`mx-5 mt-4 flex items-start gap-2 text-sm px-4 py-3 rounded-lg ${
            selectMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span>{selectMsg.type === 'success' ? '✓' : '✕'}</span>
            {selectMsg.text}
          </div>
        )}

        {/* Table */}
        {leadsLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">กำลังโหลด Leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <Users size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">{emptyMessages[tab]}</p>
            {tab === 'ALL' && (
              <p className="text-xs text-gray-400 mt-1">ใช้ฟอร์มด้านบนเพื่อเริ่มค้นหา</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="pl-5 pr-3 py-3 w-10">
                    {(tab === 'ALL' || tab === 'READY') && (
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">บริษัท</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">เบอร์โทร</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">เว็บไซต์</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">อีเมล</th>
                  <th className="px-3 pr-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50/80 transition-colors group ${
                      selectedIds.has(lead.id) ? 'bg-primary-50/60' : ''
                    }`}
                  >
                    <td className="pl-5 pr-3 py-3">
                      {canSelectLead(lead) ? (
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleLead(lead.id)}
                        />
                      ) : (
                        <div className="w-4" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <CompanyAvatar name={lead.companyName} />
                        <div>
                          <div className="font-medium text-gray-900 leading-tight">{lead.companyName}</div>
                          {lead.address && (
                            <div className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{lead.address}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 transition-colors"
                        >
                          <Phone size={12} className="text-gray-400" />
                          <span className="text-xs">{lead.phone}</span>
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      {lead.website ? (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                        >
                          <Globe size={12} className="flex-shrink-0 text-gray-400" />
                          <span className="truncate text-xs">{lead.website.replace(/^https?:\/\//, '')}</span>
                          <ChevronRight size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {lead.googleMapsRating ? (
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-medium text-gray-700">{lead.googleMapsRating}</span>
                          {lead.googleMapsReviews != null && (
                            <span className="text-xs text-gray-400">({lead.googleMapsReviews})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {lead.email ? (
                        <span className="text-xs text-gray-600 font-mono">{lead.email}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 pr-5 py-3">
                      <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full ${
                        STATUS_COLOR[lead.status] ?? 'bg-gray-100 text-gray-600'
                      }`}>
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
