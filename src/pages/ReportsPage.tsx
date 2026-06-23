import { useState } from 'react'
import { useRequests } from '@/hooks/useRequests'
import { useCategories, useTeams, useHubs } from '@/hooks/useData'
import { Card, CardContent, CardHeader, CardTitle, Button, Select, Input, EmptyState } from '@/components/ui'
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Download, FileText, BarChart3, Filter } from 'lucide-react'
import type { RequestFilters } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  review_requested: '#3b82f6', clarification_needed: '#8b5cf6', draft: '#94a3b8',
}

export function ReportsPage() {
  const [filters, setFilters] = useState<Partial<RequestFilters>>({
    status: 'all', category_id: 'all', team_id: 'all', hub_id: 'all',
    date_from: null, date_to: null,
  })

  const { data: requests = [], isLoading } = useRequests(filters)
  const { data: categories = [] } = useCategories()
  const { data: teams = [] } = useTeams()
  const { data: hubs = [] } = useHubs()

  // ── Aggregations ──────────────────────────────────────────────────────────
  const byStatus = Object.entries(
    requests.reduce((acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const byCategory = Object.entries(
    requests.reduce((acc: Record<string, number>, r) => {
      const cat = r.category?.name ?? 'Unknown'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const byPriority = Object.entries(
    requests.reduce((acc: Record<string, number>, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const byMerchant = Object.entries(
    requests.reduce((acc: Record<string, number>, r) => {
      if (r.merchant_name) acc[r.merchant_name] = (acc[r.merchant_name] || 0) + 1
      return acc
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const turnaround = requests
    .filter((r) => ['approved', 'rejected'].includes(r.status))
    .map((r) => {
      const hours = (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000
      return { id: r.req_id, hours: Math.round(hours * 10) / 10 }
    })

  const avgTurnaround = turnaround.length
    ? (turnaround.reduce((a, b) => a + b.hours, 0) / turnaround.length).toFixed(1)
    : '—'

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Request ID', 'Title', 'Merchant', 'Category', 'Team', 'Status', 'Priority', 'Hub', 'Created', 'Updated', 'SLA Due']
    const rows = requests.map((r) => [
      r.req_id, r.title, r.merchant_name,
      r.category?.name ?? '', r.creator?.team?.name ?? '',
      r.status, r.priority, r.hub?.name ?? '',
      formatDateTime(r.created_at), formatDateTime(r.updated_at), formatDate(r.due_date),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `b2ops-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500">{requests.length} records in current filter</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</p>
            <Select value={filters.status ?? 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as RequestFilters['status'] })}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="review_requested">Review Requested</option>
            </Select>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Category</p>
            <Select value={filters.category_id ?? 'all'} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
              <option value="all">All</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Team</p>
            <Select value={filters.team_id ?? 'all'} onChange={(e) => setFilters({ ...filters, team_id: e.target.value })}>
              <option value="all">All</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Hub</p>
            <Select value={filters.hub_id ?? 'all'} onChange={(e) => setFilters({ ...filters, hub_id: e.target.value })}>
              <option value="all">All</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">From</p>
            <Input type="date" value={filters.date_from ?? ''} onChange={(e) => setFilters({ ...filters, date_from: e.target.value || null })} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">To</p>
            <Input type="date" value={filters.date_to ?? ''} onChange={(e) => setFilters({ ...filters, date_to: e.target.value || null })} />
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: requests.length, color: 'text-slate-800' },
          { label: 'Approval Rate', value: requests.length ? `${Math.round((requests.filter(r => r.status === 'approved').length / requests.length) * 100)}%` : '—', color: 'text-emerald-700' },
          { label: 'Avg. Turnaround', value: `${avgTurnaround}h`, color: 'text-blue-700' },
          { label: 'SLA Breached', value: requests.filter(r => r.due_date && new Date(r.due_date) < new Date() && !['approved','rejected'].includes(r.status)).length, color: 'text-red-700' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Requests by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100)).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Requests by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top 10 Merchants</CardTitle></CardHeader>
          <CardContent>
            {byMerchant.length === 0 ? (
              <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No data" className="py-8" />
            ) : (
              <div className="space-y-2">
                {byMerchant.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-700 truncate">{m.name}</span>
                        <span className="text-xs font-bold text-slate-500 ml-2">{m.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(m.value / byMerchant[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Priority Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPriority} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                  {byPriority.map((entry) => (
                    <Cell key={entry.name} fill={
                      entry.name === 'urgent' ? '#ef4444' :
                      entry.name === 'high' ? '#f97316' :
                      entry.name === 'medium' ? '#3b82f6' : '#94a3b8'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Request Data Table
            <span className="text-xs text-slate-400 font-normal">{requests.length} rows</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['ID', 'Title', 'Merchant', 'Category', 'Team', 'Status', 'Priority', 'Hub', 'Created', 'SLA'].map((h) => (
                    <th key={h} className="text-left font-bold text-slate-400 uppercase tracking-wide pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.slice(0, 100).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-slate-400">{r.req_id}</td>
                    <td className="py-2.5 pr-4 text-slate-700 max-w-[150px] truncate font-medium">{r.title}</td>
                    <td className="py-2.5 pr-4 text-slate-500 max-w-[120px] truncate">{r.merchant_name || '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">{r.category?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">{r.creator?.team?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={r.status} showDot={false} /></td>
                    <td className="py-2.5 pr-4"><PriorityBadge priority={r.priority} /></td>
                    <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap">{r.hub?.name ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{formatDate(r.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length > 100 && (
              <p className="text-center text-xs text-slate-400 py-3">Showing 100 of {requests.length} — export CSV for full data</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
