import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { useRequest, useRequestFields, useAuditLog, useComments, useRequestAction, useProposeChanges, useDeleteRequest, useAddComment } from '@/hooks/useRequests'
import { useHubs } from '@/hooks/useData'
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge'
import { Button, Card, CardContent, CardHeader, CardTitle, Avatar, Textarea, Skeleton, EmptyState } from '@/components/ui'
import { formatDateTime, formatRelative, formatTime, cn } from '@/lib/utils'
import {
  ArrowLeft, Clock, Building2, User, Tag, AlertTriangle,
  Send, Edit2, Trash2, CheckCircle, XCircle, HelpCircle,
  ChevronDown, ChevronUp, History, MessageSquare, Info
} from 'lucide-react'
import type { RequestField, CategoryField } from '@/types'
import { ProposeChangesModal } from '@/components/requests/ProposeChangesModal'
import { EditRequestModal } from '@/components/requests/EditRequestModal'

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: request, isLoading } = useRequest(id!)
  const { data: fields = [] } = useRequestFields(id!)
  const { data: logs = [] } = useAuditLog(id!)
  const { data: comments = [] } = useComments(id!)
  const { data: hubs = [] } = useHubs()

  const { mutate: takeAction, isPending: actionPending } = useRequestAction()
  const { mutate: deleteRequest, isPending: deletePending } = useDeleteRequest()
  const { mutate: addComment, isPending: commentPending } = useAddComment()

  const [activeTab, setActiveTab] = useState<'details' | 'thread' | 'history'>('details')
  const [comment, setComment] = useState('')
  const [actionComment, setActionComment] = useState('')
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showActionPanel, setShowActionPanel] = useState(true)

  if (isLoading) return <DetailSkeleton />
  if (!request) return (
    <div className="p-6">
      <EmptyState icon={<Info className="h-6 w-6" />} title="Request not found" action={
        <Button variant="outline" onClick={() => navigate('/requests')}>Back to Requests</Button>
      } />
    </div>
  )

  const isCreator = request.created_by === user?.id
  const isFromMyTeam = request.creator?.team_id === user?.team_id
  const isFromOtherTeam = !isFromMyTeam
  const myTeamId = user?.team_id

  // What actions can I take?
  const canApproveReject = isFromOtherTeam && request.status === 'pending'
  const canProposeChanges = isFromOtherTeam && request.status === 'pending'
  const canReviewProposal = isFromMyTeam && request.status === 'review_requested'
  const canClarify = isFromOtherTeam && request.status === 'pending'
  const canEdit = isCreator && ['draft', 'pending'].includes(request.status)
  const canDelete = isCreator && ['draft', 'pending'].includes(request.status)

  const showActionSidebar = canApproveReject || canProposeChanges || canReviewProposal || canClarify

  const handleAction = (action: 'approve' | 'reject' | 'request_clarification') => {
    if (!actionComment.trim() && action !== 'approve') {
      return
    }
    takeAction(
      { request_id: request.id, action, comment: actionComment },
      { onSuccess: () => { setActionComment(''); setShowActionPanel(false) } }
    )
  }

  const handleComment = () => {
    if (!comment.trim()) return
    addComment({ requestId: request.id, message: comment }, {
      onSuccess: () => setComment('')
    })
  }

  const hub = hubs.find((h) => h.id === request.hub_id)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Requests
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Main Content ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title Card */}
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {request.req_id}
                    </span>
                    <StatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">{request.title}</h1>
                  {request.description && (
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">{request.description}</p>
                  )}
                </div>
                {/* Creator Actions */}
                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-1.5">
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    {canDelete && !showDeleteConfirm && (
                      <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-600 hover:bg-red-50 gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                    {showDeleteConfirm && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <span className="text-xs font-semibold text-red-700">Confirm delete?</span>
                        <Button size="sm" variant="destructive" loading={deletePending}
                          onClick={() => deleteRequest(request.id, { onSuccess: () => navigate('/requests') })}>
                          Yes
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>No</Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {([
              { key: 'details', label: 'Details', icon: Info },
              { key: 'thread', label: `Thread (${comments.length})`, icon: MessageSquare },
              { key: 'history', label: `Activity (${logs.length})`, icon: History },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
                  activeTab === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <FieldsTab fields={fields} categoryFields={request.category?.fields ?? []} />
          )}
          {activeTab === 'thread' && (
            <ThreadTab
              comments={comments}
              comment={comment}
              setComment={setComment}
              onSubmit={handleComment}
              loading={commentPending}
            />
          )}
          {activeTab === 'history' && <HistoryTab logs={logs} />}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader><CardTitle>Request Info</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Created by">
                  <div className="flex items-center gap-2">
                    <Avatar src={request.creator?.avatar_url} name={request.creator?.name || '?'} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">{request.creator?.name}</p>
                      <p className="text-[10px] text-slate-400">{request.creator?.team?.name}</p>
                    </div>
                  </div>
                </MetaRow>
                <MetaRow icon={<Tag className="h-3.5 w-3.5" />} label="Category">
                  <span className="text-slate-700">{request.category?.name ?? '—'}</span>
                </MetaRow>
                {hub && (
                  <MetaRow icon={<Building2 className="h-3.5 w-3.5" />} label="Hub">
                    <span className="text-slate-700">{hub.name}</span>
                  </MetaRow>
                )}
                <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Submitted">
                  <span className="text-slate-700">{formatDateTime(request.created_at)}</span>
                </MetaRow>
                {request.due_date && (
                  <MetaRow icon={<AlertTriangle className="h-3.5 w-3.5" />} label="SLA Due">
                    <span className={cn('font-medium', new Date(request.due_date) < new Date() ? 'text-red-600' : 'text-slate-700')}>
                      {formatDateTime(request.due_date)}
                    </span>
                  </MetaRow>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Action Panel */}
          {showActionSidebar && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <button
                  onClick={() => setShowActionPanel(!showActionPanel)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-blue-800">
                    {canReviewProposal ? '🔄 Review Proposal' : '⚡ Take Action'}
                  </CardTitle>
                  {showActionPanel ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
                </button>
              </CardHeader>

              {showActionPanel && (
                <CardContent>
                  {canReviewProposal && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-800">
                        Ops team has proposed field changes. Review the proposed values in the Details tab and decide.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">
                        Comment {!canApproveReject ? '*' : ''}
                      </label>
                      <Textarea
                        rows={3}
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="Add your comment or reason..."
                        className="text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      {(canApproveReject || canReviewProposal) && (
                        <Button
                          variant="success"
                          loading={actionPending}
                          onClick={() => handleAction('approve')}
                          className="w-full gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {canReviewProposal ? 'Accept Proposal' : 'Approve'}
                        </Button>
                      )}
                      {(canApproveReject || canReviewProposal) && (
                        <Button
                          variant="destructive"
                          loading={actionPending}
                          disabled={!actionComment.trim()}
                          onClick={() => handleAction('reject')}
                          className="w-full gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          {canReviewProposal ? 'Reject Proposal' : 'Reject'}
                        </Button>
                      )}
                      {canProposeChanges && (
                        <Button
                          variant="warning"
                          onClick={() => setShowProposeModal(true)}
                          className="w-full gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Propose Changes
                        </Button>
                      )}
                      {canClarify && (
                        <Button
                          variant="outline"
                          loading={actionPending}
                          disabled={!actionComment.trim()}
                          onClick={() => handleAction('request_clarification')}
                          className="w-full gap-2 text-purple-700 border-purple-200 hover:bg-purple-50"
                        >
                          <HelpCircle className="h-4 w-4" />
                          Request Clarification
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProposeModal && (
        <ProposeChangesModal
          request={request}
          fields={fields}
          onClose={() => setShowProposeModal(false)}
        />
      )}
      {showEditModal && (
        <EditRequestModal
          request={request}
          fields={fields}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldsTab({ fields, categoryFields }: { fields: RequestField[], categoryFields: CategoryField[] }) {
  const orderedFields = categoryFields
    .sort((a, b) => a.display_order - b.display_order)
    .map((cf) => {
      const f = fields.find((rf) => rf.field_key === cf.key)
      return { ...cf, current_value: f?.current_value ?? '', proposed_value: f?.proposed_value ?? null }
    })

  if (!orderedFields.length) {
    return <EmptyState icon={<Info className="h-5 w-5" />} title="No fields configured" className="py-10" />
  }

  return (
    <Card>
      <CardHeader><CardTitle>Field Values</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {orderedFields.map((f) => {
            const hasProposal = f.proposed_value !== null && f.proposed_value !== undefined && f.proposed_value !== ''
            return (
              <div
                key={f.key}
                className={cn(
                  'p-3 rounded-xl border',
                  hasProposal ? 'border-amber-200 bg-amber-50/50' : 'border-slate-100 bg-slate-50'
                )}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{f.label}</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatTime(f.current_value) || <span className="text-slate-300 font-normal">—</span>}
                </p>
                {hasProposal && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-200">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">Proposed</p>
                    <p className="text-sm font-semibold text-amber-800">{formatTime(f.proposed_value!)}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ThreadTab({
  comments, comment, setComment, onSubmit, loading,
}: {
  comments: ReturnType<typeof useComments>['data']
  comment: string
  setComment: (v: string) => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comment Thread</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4 mb-5 max-h-[400px] overflow-y-auto pr-1">
          {(comments ?? []).length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No comments yet" className="py-8" />
          ) : (
            (comments ?? []).map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.user?.avatar_url} name={c.user?.name || '?'} size="sm" className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{c.user?.name}</span>
                      <span className="text-[10px] text-slate-400">{formatRelative(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Compose */}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <div className="flex-1">
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) onSubmit() }}
            />
          </div>
          <Button
            variant="brand"
            size="icon"
            loading={loading}
            disabled={!comment.trim()}
            onClick={onSubmit}
            className="h-9 w-9 shrink-0 mt-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">⌘+Enter to send</p>
      </CardContent>
    </Card>
  )
}

function HistoryTab({ logs }: { logs: ReturnType<typeof useAuditLog>['data'] }) {
  const actionConfig: Record<string, { color: string; icon: string }> = {
    CREATED: { color: 'bg-blue-500', icon: '✨' },
    DRAFT_SAVED: { color: 'bg-slate-400', icon: '📝' },
    UPDATED: { color: 'bg-amber-500', icon: '✏️' },
    APPROVED: { color: 'bg-emerald-500', icon: '✅' },
    REJECTED: { color: 'bg-red-500', icon: '❌' },
    CHANGES_PROPOSED: { color: 'bg-orange-500', icon: '🔄' },
    PROPOSAL_ACCEPTED: { color: 'bg-emerald-400', icon: '👍' },
    PROPOSAL_REJECTED: { color: 'bg-red-400', icon: '👎' },
    CLARIFICATION_REQUESTED: { color: 'bg-purple-500', icon: '❓' },
    COMMENT_ADDED: { color: 'bg-slate-400', icon: '💬' },
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Audit Trail</CardTitle></CardHeader>
      <CardContent>
        {(logs ?? []).length === 0 ? (
          <EmptyState icon={<History className="h-5 w-5" />} title="No activity yet" className="py-8" />
        ) : (
          <div className="space-y-0">
            {(logs ?? []).map((log, idx) => {
              const cfg = actionConfig[log.action] ?? { color: 'bg-slate-400', icon: '🔹' }
              return (
                <div key={log.id} className="flex gap-4 relative">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm ring-4 ring-white z-10', cfg.color)}>
                      {cfg.icon}
                    </div>
                    {idx !== (logs ?? []).length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-100 my-1" />
                    )}
                  </div>
                  <div className="pb-5 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {log.action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                        </p>
                        {log.metadata && typeof log.metadata === 'object' && 'comment' in (log.metadata as Record<string, unknown>) && !!(log.metadata as Record<string, unknown>).comment && (
                          <p className="text-xs text-slate-500 mt-0.5 italic">"{String((log.metadata as Record<string, unknown>).comment)}"</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">{formatRelative(log.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {log.performer && <Avatar src={log.performer.avatar_url} name={log.performer.name} size="sm" className="!h-5 !w-5" />}
                      <p className="text-[11px] text-slate-400">{log.performer?.name ?? 'System'}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pt-0.5 w-28">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex-1 text-xs">{children}</div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
