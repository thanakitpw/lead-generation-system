import { useQuery } from '@tanstack/react-query'
import { Users, Mail, BarChart2, MessageSquare, AlertCircle, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

interface OverviewData {
  totalLeads: number
  totalEmailsSent: number
  openRate: number
  replyRate: number
  pendingReviewCount: number
  apiCostThb: number
  recentActivity: Array<{
    id: string
    eventType: string
    occurredAt: string
    draft: { campaignLead: { lead: { companyName: string } } }
  }>
}

const statCards = [
  { key: 'totalLeads', label: 'Leads ทั้งหมด', icon: Users, color: 'text-blue-600 bg-blue-50' },
  { key: 'totalEmailsSent', label: 'อีเมลที่ส่งแล้ว', icon: Mail, color: 'text-green-600 bg-green-50' },
  { key: 'openRate', label: 'Open Rate', icon: BarChart2, color: 'text-amber-600 bg-amber-50', suffix: '%' },
  { key: 'replyRate', label: 'Reply Rate', icon: MessageSquare, color: 'text-purple-600 bg-purple-50', suffix: '%' },
]

const eventTypeLabel: Record<string, string> = {
  SENT: '📤 ส่งอีเมล',
  DELIVERED: '✅ ส่งสำเร็จ',
  OPENED: '👁 เปิดอ่าน',
  CLICKED: '🖱 คลิกลิงก์',
  REPLIED: '💬 ตอบกลับ',
  BOUNCED: '⛔ Bounce',
  UNSUBSCRIBED: '🚫 ยกเลิก',
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">ภาพรวมระบบ Lead Generation</p>
        </div>
        {data?.pendingReviewCount ? (
          <Link
            to="/drafts"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <AlertCircle size={14} />
            {data.pendingReviewCount} drafts รอ Review
          </Link>
        ) : null}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, suffix }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${color}`}>
                <Icon size={16} />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg tracking-wide uppercase">
                รวม
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {String(data?.[key as keyof OverviewData] ?? 0)}{suffix}
            </div>
            <div className="text-xs font-medium text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* API Cost */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50">
                <DollarSign size={14} className="text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">AI API Cost เดือนนี้</h2>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
              <TrendingUp size={11} />
              Live
            </div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mb-1">
            ฿{data?.apiCostThb?.toFixed(2) ?? '0.00'}
          </div>
          <p className="text-xs text-gray-400 mt-2">OpenRouter API · อัตรา ≈ ฿0.32/email</p>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="p-2 rounded-xl bg-purple-50">
              <MessageSquare size={14} className="text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">กิจกรรมล่าสุด</h2>
          </div>
          {!data?.recentActivity?.length ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                <MessageSquare size={18} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">ยังไม่มีกิจกรรม</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {data.recentActivity.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none w-6 text-center">{eventTypeLabel[event.eventType]?.split(' ')[0]}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 leading-tight">
                        {event.draft?.campaignLead?.lead?.companyName ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {eventTypeLabel[event.eventType]?.split(' ').slice(1).join(' ') ?? event.eventType}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(event.occurredAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
