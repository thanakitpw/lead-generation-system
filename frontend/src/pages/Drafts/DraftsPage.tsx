import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
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
      <h1 className="text-xl font-semibold text-gray-900">Email Drafts</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1) }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              status === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {key === 'PENDING_REVIEW' && data?.pagination?.total > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {data.pagination.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-sm">ไม่มี Draft ในสถานะนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft: any) => {
            const lead = draft.campaignLead?.lead
            const campaign = draft.campaignLead?.campaign
            const confidence = draft.aiConfidence ? Math.round(Number(draft.aiConfidence) * 100) : null
            return (
              <Link
                key={draft.id}
                to={`/drafts/${draft.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lead?.companyName ?? '—'}</p>
                    <p className="text-sm text-gray-500 truncate">{lead?.email ?? '—'}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1.5 truncate">📧 {draft.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{campaign?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {confidence !== null && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        confidence >= 75 ? 'bg-green-100 text-green-700' :
                        confidence >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        AI {confidence}%
                      </span>
                    )}
                    {status === 'PENDING_REVIEW' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        รอ Review
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(draft.createdAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ← ก่อนหน้า
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
