import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react'
import api from '../../lib/api'

export default function DraftReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft', id],
    queryFn: () => api.get(`/drafts/${id}`).then((r) => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/drafts/${id}/approve`),
    onSuccess: () => {
      setMsg('✅ ส่งอีเมลสำเร็จแล้ว!')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      setTimeout(() => navigate('/drafts'), 1500)
    },
    onError: (err: any) => setMsg(`❌ ${err.response?.data?.error || 'เกิดข้อผิดพลาด'}`),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.post(`/drafts/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => {
      setMsg('Draft ถูก Reject แล้ว')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      setTimeout(() => navigate('/drafts'), 1200)
    },
    onError: (err: any) => setMsg(`❌ ${err.response?.data?.error || 'เกิดข้อผิดพลาด'}`),
  })

  const regenerateMutation = useMutation({
    mutationFn: () => api.post(`/drafts/${id}/regenerate`),
    onSuccess: () => {
      setMsg('✨ สร้างอีเมลใหม่แล้ว!')
      queryClient.invalidateQueries({ queryKey: ['draft', id] })
    },
    onError: (err: any) => setMsg(`❌ ${err.response?.data?.error || 'เกิดข้อผิดพลาด'}`),
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">กำลังโหลด...</div>
  if (!draft) return <div className="text-center py-12 text-gray-400">ไม่พบ Draft</div>

  const lead = draft.campaignLead?.lead
  const campaign = draft.campaignLead?.campaign
  const confidence = draft.aiConfidence ? Math.round(Number(draft.aiConfidence) * 100) : null
  const isPending = draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED'
  const isBusy = approveMutation.isPending || rejectMutation.isPending || regenerateMutation.isPending

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{lead?.companyName ?? 'Draft Review'}</h1>
          <p className="text-sm text-gray-400">{lead?.email} · {campaign?.name}</p>
        </div>
        {confidence !== null && (
          <span className={`ml-auto text-sm font-medium px-3 py-1 rounded-full ${
            confidence >= 75 ? 'bg-green-100 text-green-700' :
            confidence >= 60 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            AI Confidence: {confidence}%
          </span>
        )}
      </div>

      {draft.aiReasoning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <span className="font-medium">AI Reasoning: </span>{draft.aiReasoning}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Subject</p>
          <p className="text-gray-900 font-semibold mt-0.5">{draft.subject}</p>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Email Body</p>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: draft.bodyHtml }}
          />
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          msg.startsWith('❌') ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {msg}
        </div>
      )}

      {isPending && !showRejectForm && (
        <div className="flex gap-3">
          <button
            onClick={() => approveMutation.mutate()}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {approveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Approve & ส่งอีเมลเลย
          </button>
          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {regenerateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Regenerate
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-3 px-5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            <XCircle size={16} />
            Reject
          </button>
        </div>
      )}

      {showRejectForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">เหตุผลที่ Reject (optional)</h3>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            placeholder="เช่น ข้อมูลบริษัทไม่ถูกต้อง, โทนไม่เหมาะสม..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={isBusy}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {rejectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              ยืนยัน Reject
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 space-y-1">
        <p>Status: <span className="font-medium">{draft.status}</span></p>
        {draft.aiTokensUsed && <p>Tokens used: {draft.aiTokensUsed} · Cost: ~${Number(draft.aiCostUsd).toFixed(4)}</p>}
      </div>
    </div>
  )
}
