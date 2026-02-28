import { useQuery } from '@tanstack/react-query'
import { Users, Mail, BarChart2, MessageSquare, AlertCircle, DollarSign } from 'lucide-react'
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
        <div className="text-gray-400">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        {data?.pendingReviewCount ? (
          <a
            href="/drafts"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <AlertCircle size={14} />
            {data.pendingReviewCount} drafts รอ Review
          </a>
        ) : null}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, color, suffix }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {String(data?.[key as keyof OverviewData] ?? 0)}{suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">API Cost เดือนนี้</h2>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ฿{data?.apiCostThb?.toFixed(2) ?? '0.00'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Claude API (อัตรา ≈ ฿0.32/email)</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          {!data?.recentActivity?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีกิจกรรม</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.recentActivity.map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{eventTypeLabel[event.eventType] ?? event.eventType}</span>
                    <span className="text-gray-500 truncate max-w-[120px]">
                      {event.draft?.campaignLead?.lead?.companyName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
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
