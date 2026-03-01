import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, ChevronRight, Pencil, Trash2 } from 'lucide-react'
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

const statusLabel: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  ACTIVE: { label: 'กำลังทำงาน', className: 'bg-green-100 text-green-700' },
  PAUSED: { label: 'หยุดชั่วคราว', className: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'เสร็จสิ้น', className: 'bg-blue-100 text-blue-700' },
  ARCHIVED: { label: 'เก็บถาวร', className: 'bg-gray-100 text-gray-500' },
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
        <h1 className="text-xl font-semibold text-gray-900">แคมเปญ</h1>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          สร้างแคมเปญใหม่
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">ยังไม่มีแคมเปญ</p>
          <Link to="/campaigns/new" className="text-primary-600 text-sm font-medium mt-2 inline-block hover:underline">
            สร้างแคมเปญแรก →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = statusLabel[c.status] ?? statusLabel.DRAFT
            const openRate = c.statsEmailsSent > 0 ? Math.round((c.statsEmailsOpened / c.statsEmailsSent) * 100) : 0
            const replyRate = c.statsEmailsSent > 0 ? Math.round((c.statsEmailsReplied / c.statsEmailsSent) * 100) : 0
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.targetLocation && (
                      <p className="text-sm text-gray-500 mt-0.5">📍 {c.targetLocation}</p>
                    )}
                    {c.targetKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.targetKeywords.slice(0, 3).map((kw) => (
                          <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {c.status === 'ACTIVE' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); pauseMutation.mutate(c.id) }}
                        className="flex items-center gap-1.5 text-sm text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pause size={13} /> หยุด
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); startMutation.mutate(c.id) }}
                        className="flex items-center gap-1.5 text-sm text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Play size={13} /> เริ่ม
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${c.id}/edit`) }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="p-1.5 text-gray-300">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                  {[
                    { label: 'Leads', value: c.statsTotalLeads },
                    { label: 'ส่งแล้ว', value: c.statsEmailsSent },
                    { label: 'Open Rate', value: `${openRate}%` },
                    { label: 'Reply Rate', value: `${replyRate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <div className="text-sm font-semibold text-gray-900">{value}</div>
                      <div className="text-xs text-gray-400">{label}</div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">ลบแคมเปญ?</h3>
            <p className="text-sm text-gray-500 mb-5">
              การลบจะลบ leads และข้อมูลทั้งหมดในแคมเปญนี้ด้วย ไม่สามารถกู้คืนได้
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
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
