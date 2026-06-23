import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useRequests } from '@/hooks/useRequests'
import { useCategories, useHubs, useTeams } from '@/hooks/useData'
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { Button, Input, Select, Card, EmptyState, Skeleton } from '@/components/ui'
import { formatDate, formatRelative, isSLABreached, cn } from '@/lib/utils'
import { Plus, Search, Filter, X, FileText, RefreshCw, AlertTriangle } from 'lucide-react'
import type { RequestFilters, RequestStatus, RequestPriority } from '@/types'
import { CreateRequestModal } from '@/components/requests/CreateRequestModal'

const DEFAULT_FILTERS: RequestFilters = {
  search: '', status: 'all', priority: 'all',
  category_id: 'all', team_id: 'all', hub_id: 'all',
  date_from: null, date_to: null, view: 'all',
}

export function RequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<RequestFilters>({
    ...DEFAULT_FILTERS,
    status: (searchParams.get('status') as RequestStatus) || 'all',
    view: (searchParams.get('view') as RequestFilters['view']) || 'all',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const { data: requests = [], isLoading, refetch } = useRequests(filters)
  const { data: categories = [] } = useCategories()
  const { data: hubs = [] } = useHubs()
  const { data: teams = [] } = useTeams()

  const setFilter = <K extends keyof RequestFilters>(key: K, val: RequestFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: val }))

  // Apply view filter client-side for team filtering
  const filteredRequests = requests.filter((r) => {
    if (filters.view === 'my') return r.created_by === user?.id
    if (filters.view === 'team') return r.creator?.team_id === user?.team_id
    return true
  })

  const activeFilterCount = [
    filters.status !== 'all', filters.priority !== 'all',
    filters.category_id !== 'all', filters.hub_id !== 'all',
    filters.date_from, filters.date_to,
  ].filter(Boolean).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="brand" onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by ID, title, merchant..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['all', 'team', 'my'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter('view', v)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold capitalize transition-all',
                  filters.view === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {v === 'my' ? 'My Requests' : v === 'team' ? 'My Team' : 'All'}
              </button>
            ))}
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 relative"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
              <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value as RequestStatus | 'all')}>
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="review_requested">Review Requested</option>
                <option value="clarification_needed">Clarification</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
              <Select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value as RequestPriority | 'all')}>
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Category</label>
              <Select value={filters.category_id} onChange={(e) => setFilter('category_id', e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Team</label>
              <Select value={filters.team_id} onChange={(e) => setFilter('team_id', e.target.value)}>
                <option value="all">All Teams</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">From</label>
              <Input type="date" value={filters.date_from || ''} onChange={(e) => setFilter('date_from', e.target.value || null)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">To</label>
              <Input type="date" value={filters.date_to || ''} onChange={(e) => setFilter('date_to', e.target.value || null)} />
            </div>
            <div className="col-span-full flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)} className="text-slate-500 gap-1">
                <X className="h-3.5 w-3.5" /> Reset filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="No requests found"
            description={filters.search ? `No results for "${filters.search}"` : 'Try adjusting your filters'}
            action={
              <Button variant="brand" size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Request
              </Button>
            }
            className="py-20"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Request ID', 'Title', 'Merchant', 'Category', 'Team', 'Priority', 'Status', 'SLA', 'Created'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRequests.map((req) => {
                  const slaBreached = isSLABreached(req.due_date) && !['approved', 'rejected'].includes(req.status)
                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">{req.req_id}</td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-semibold text-slate-800 group-hover:text-blue-700 truncate transition-colors">
                          {req.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate">{req.merchant_name || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{req.category?.name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{req.creator?.team?.name ?? '—'}</td>
                      <td className="px-4 py-3.5"><PriorityBadge priority={req.priority} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={req.status} /></td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {slaBreached ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertTriangle className="h-3 w-3" /> Breached
                          </span>
                        ) : req.due_date ? (
                          <span className="text-xs text-slate-400">{formatDate(req.due_date)}</span>
                        ) : <span className="text-slate-200">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{formatRelative(req.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
