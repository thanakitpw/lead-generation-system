import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Loader2, Mail, ChevronRight } from 'lucide-react'
import api from '../../lib/api'

const STATUS_TABS = [
  { key: 'PENDING_REVIEW', label: 'รอ Review', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle },
  { key: 'SENT', label: 'ส่งแล้ว', icon: CheckCircle },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle },
]

export default function DraftsPage() {
  const [status, setStatus] = useState('PENDING_REVIEW')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['drafts', status, page],
    queryFn: () => api.get('/drafts', { params: { status, page, limit: 20 } }).then((r) => r.data),
  })

  const drafts = data?.data ?? []
  const totalPages = data?.pagination?.totalPages ?? 1

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Email Drafts</h1>
        <p className="text-sm text-gray-500 mt-0.5">ตรวจสอบและอนุมัติอีเมลก่อนส่ง</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 shadow-sm p-1 rounded-xl w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1) }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              status === key
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {label}
            {key === 'PENDING_REVIEW' && data?.pagination?.total > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                status === key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
              }`}>
                {data.pagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Mail size={20} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">ไม่มี Draft ในสถานะนี้</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {drafts.map((draft: any) => {
            const lead = draft.campaignLead?.lead
            const campaign = draft.campaignLead?.campaign
            const confidence = draft.aiConfidence ? Math.round(Number(draft.aiConfidence) * 100) : null
            return (
              <Link
                key={draft.id}
                to={`/drafts/${draft.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 hover:shadow-md transition-all group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-700">
                    {(lead?.companyName ?? '?')[0].toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate text-sm">{lead?.companyName ?? '—'}</p>
                    {confidence !== null && (
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        confidence >= 75 ? 'bg-green-100 text-green-700' :
                        confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        AI {confidence}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{lead?.email ?? '—'}</p>
                  <p className="text-xs font-medium text-gray-600 truncate mt-1">{draft.subject}</p>
                </div>

                {/* Meta */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {new Date(draft.createdAt).toLocaleDateString('th-TH')}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{campaign?.name}</span>
                </div>

                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← ก่อนหน้า
          </button>
          <span className="px-3 py-2 text-sm text-gray-500 font-medium">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
