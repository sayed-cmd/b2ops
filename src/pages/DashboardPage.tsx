import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useDashboardStats, useMonthlyTrend } from '@/hooks/useData'
import { useRequests } from '@/hooks/useRequests'
import { Card, CardContent, CardHeader, CardTitle, Skeleton, EmptyState } from '@/components/ui'
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { formatRelative, formatDate, isSLABreached, cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import {
  FileText, Clock, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, ArrowRight, Zap
} from 'lucide-react'
import type { Request } from '@/types'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: trend = [] } = useMonthlyTrend()
  const { data: allRequests = [] } = useRequests({})

  // My pending actions = requests from opposite team that need MY team's action
  const myTeamId = user?.team_id
  const pendingActions = allRequests.filter((r) => {
    const isFromOtherTeam = r.creator?.team_id !== myTeamId
    const isFromMyTeam = r.creator?.team_id === myTeamId
    if (isFromOtherTeam && r.status === 'pending') return true
    if (isFromMyTeam && r.status === 'review_requested') return true
    return false
  })

  const myRecentRequests = allRequests
    .filter((r) => r.created_by === user?.id)
    .slice(0, 5)

  const statCards = [
    { label: 'Total Requests', value: stats?.total ?? 0, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: stats?.approved ?? 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'SLA Breached', value: stats?.sla_breached ?? 0, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    {
      label: 'Avg. Turnaround',
      value: stats?.avg_turnaround_hours ? `${stats.avg_turnaround_hours.toFixed(1)}h` : '—',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.team?.name} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {pendingActions.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <Zap className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-800">
              {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''} require your attention
            </p>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              {statsLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                    <s.icon className={cn('h-4 w-4', s.color)} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Action Required
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {pendingActions.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingActions.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="All caught up!"
                  description="No pending actions"
                  className="py-8"
                />
              ) : (
                <div className="space-y-2">
                  {pendingActions.slice(0, 6).map((req) => (
                    <ActionCard key={req.id} req={req} onClick={() => navigate(`/requests/${req.id}`)} />
                  ))}
                  {pendingActions.length > 6 && (
                    <button
                      onClick={() => navigate('/requests?status=pending')}
                      className="w-full text-center text-xs text-blue-600 font-semibold py-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View {pendingActions.length - 6} more →
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {trend.length === 0 ? (
                <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No data yet" className="py-12" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Total" />
                    <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Approved" />
                    <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Rejected" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* My Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            My Recent Requests
            <button
              onClick={() => navigate('/requests?view=my')}
              className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myRecentRequests.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No requests yet"
              description="Submit your first requisition to get started"
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Request ID', 'Title', 'Category', 'Priority', 'Status', 'Created', 'SLA'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {myRecentRequests.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500">{req.req_id}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800 max-w-[200px] truncate">{req.title}</td>
                      <td className="py-3 pr-4 text-slate-500">{req.category?.name ?? '—'}</td>
                      <td className="py-3 pr-4"><PriorityBadge priority={req.priority} /></td>
                      <td className="py-3 pr-4"><StatusBadge status={req.status} /></td>
                      <td className="py-3 pr-4 text-slate-400 text-xs">{formatDate(req.created_at)}</td>
                      <td className="py-3 pr-4">
                        {req.due_date ? (
                          <span className={cn('text-xs font-medium', isSLABreached(req.due_date) && !['approved','rejected'].includes(req.status) ? 'text-red-600' : 'text-slate-400')}>
                            {isSLABreached(req.due_date) && !['approved','rejected'].includes(req.status) ? '⚠️ Breached' : formatDate(req.due_date)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ActionCard({ req, onClick }: { req: Request; onClick: () => void }) {
  const slaBreached = isSLABreached(req.due_date)
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate leading-snug">
          {req.title}
        </p>
        <StatusBadge status={req.status} showDot={false} className="shrink-0 text-[10px]" />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[11px] font-mono text-slate-400">{req.req_id}</p>
        <div className="flex items-center gap-2">
          {slaBreached && <span className="text-[10px] text-red-600 font-bold">⚠️ SLA</span>}
          <span className="text-[11px] text-slate-400">{formatRelative(req.created_at)}</span>
        </div>
      </div>
    </button>
  )
}
