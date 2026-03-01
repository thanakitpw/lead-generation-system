import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, ChevronRight, Pencil, Trash2, Loader2, MapPin, Search, Users, Mail } from 'lucide-react'
import api from '../../lib/api'

interface Campaign {
  id: string
  name: string
  status: string
  targetLocation: string
  targetKeywords: string[]
  statsTotalLeads: number
  statsEmailsSent: number
  statsEmailsOpened: number
  statsEmailsReplied: number
  createdAt: string
}

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  DRAFT:     { label: 'Draft',        dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500' },
  ACTIVE:    { label: 'กำลังทำงาน',   dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  PAUSED:    { label: 'หยุดชั่วคราว', dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'เสร็จสิ้น',    dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  ARCHIVED:  { label: 'เก็บถาวร',     dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-400' },
}

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => api.put(`/campaigns/${id}/start`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.put(`/campaigns/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      setConfirmDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">แคมเปญ</h1>
          <p className="text-sm text-gray-500 mt-0.5">จัดการแคมเปญหา lead และส่งอีเมล</p>
        </div>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={15} />
          สร้างแคมเปญใหม่
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Search size={20} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">ยังไม่มีแคมเปญ</p>
          <p className="text-xs text-gray-400 mb-4">สร้างแคมเปญแรกเพื่อเริ่ม scrape และส่งอีเมล</p>
          <Link to="/campaigns/new" className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
            <Plus size={13} /> สร้างเลย
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = statusConfig[c.status] ?? statusConfig.DRAFT
            const openRate = c.statsEmailsSent > 0 ? Math.round((c.statsEmailsOpened / c.statsEmailsSent) * 100) : 0
            const replyRate = c.statsEmailsSent > 0 ? Math.round((c.statsEmailsReplied / c.statsEmailsSent) * 100) : 0
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-primary-600 transition-colors">{c.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {c.targetLocation && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />{c.targetLocation}
                        </span>
                      )}
                      {c.targetKeywords?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Search size={11} />{c.targetKeywords.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.status === 'ACTIVE' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); pauseMutation.mutate(c.id) }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <Pause size={12} /> หยุด
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); startMutation.mutate(c.id) }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <Play size={12} /> เริ่ม
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${c.id}/edit`) }}
                      className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id) }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-50">
                  {[
                    { label: 'Leads', value: c.statsTotalLeads, icon: Users },
                    { label: 'ส่งแล้ว', value: c.statsEmailsSent, icon: Mail },
                    { label: 'Open Rate', value: `${openRate}%`, icon: null },
                    { label: 'Reply Rate', value: `${replyRate}%`, icon: null },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-sm font-bold text-gray-900">{value}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-red-50">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">ลบแคมเปญ?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              การลบจะลบ leads และข้อมูลทั้งหมดในแคมเปญนี้ด้วย ไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'กำลังลบ...' : 'ลบเลย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
