// ─── User & Auth ─────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'agent'

export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: UserRole
  team_id: string | null
  is_active: boolean
  created_at: string
  team?: Team
}

// ─── Team ────────────────────────────────────────────────────────────────────
export interface Team {
  id: string
  name: string
  group_emails: string[]
  created_at: string
}

// ─── Hub ─────────────────────────────────────────────────────────────────────
export interface Hub {
  id: string
  name: string
  email: string
  region: string | null
  is_active: boolean
}

// ─── Category & Fields ───────────────────────────────────────────────────────
export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea'
export type EditableBy = 'creator' | 'reviewer' | 'both'

export interface CategoryField {
  key: string
  label: string
  type: FieldType
  required: boolean
  editable_by: EditableBy
  options?: string[]
  display_order: number
  placeholder?: string
}

export interface Category {
  id: string
  name: string
  team_id: string
  sla_hours: number
  is_active: boolean
  fields: CategoryField[]
  created_at: string
  team?: Team
}

// ─── Request ─────────────────────────────────────────────────────────────────
export type RequestStatus =
  | 'draft'
  | 'pending'
  | 'review_requested'
  | 'clarification_needed'
  | 'approved'
  | 'rejected'

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface RequestField {
  id: string
  request_id: string
  field_key: string
  field_label: string
  current_value: string
  proposed_value: string | null
  version: number
}

export interface RequestFieldHistory {
  id: string
  request_id: string
  field_key: string
  field_label: string
  old_value: string
  new_value: string
  changed_by: string
  changed_at: string
  version: number
  changer?: User
}

export interface Request {
  id: string
  req_id: string
  title: string
  category_id: string
  created_by: string
  status: RequestStatus
  priority: RequestPriority
  due_date: string | null
  hub_id: string | null
  merchant_name: string
  description: string | null
  current_version: number
  email_thread_id: string | null
  created_at: string
  updated_at: string
  // Joined
  category?: Category
  creator?: User
  hub?: Hub
  fields?: RequestField[]
}

// ─── Comment ─────────────────────────────────────────────────────────────────
export interface Comment {
  id: string
  request_id: string
  user_id: string
  message: string
  parent_id: string | null
  created_at: string
  updated_at: string
  user?: User
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string
  request_id: string
  action: string
  performed_by: string
  old_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  timestamp: string
  performer?: User
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType =
  | 'new_request'
  | 'status_changed'
  | 'proposal_received'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'comment_added'
  | 'clarification_needed'
  | 'sla_breach'

export interface Notification {
  id: string
  user_id: string
  request_id: string | null
  type: NotificationType
  message: string
  is_read: boolean
  created_at: string
  request?: Pick<Request, 'id' | 'req_id' | 'title' | 'status'>
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  total: number
  pending: number
  approved: number
  rejected: number
  review_requested: number
  sla_breached: number
  avg_turnaround_hours: number
}

// ─── Filters ─────────────────────────────────────────────────────────────────
export interface RequestFilters {
  search: string
  status: RequestStatus | 'all'
  priority: RequestPriority | 'all'
  category_id: string | 'all'
  team_id: string | 'all'
  hub_id: string | 'all'
  date_from: string | null
  date_to: string | null
  view: 'my' | 'team' | 'all'
}

// ─── Form Payloads ───────────────────────────────────────────────────────────
export interface CreateRequestPayload {
  title: string
  category_id: string
  priority: RequestPriority
  hub_id: string | null
  merchant_name: string
  description: string
  fields: { key: string; label: string; value: string }[]
  is_draft: boolean
}

export interface ProposeChangesPayload {
  request_id: string
  changed_fields: { key: string; label: string; old_value: string; new_value: string }[]
  comment: string
}

export interface ActionPayload {
  request_id: string
  action: 'approve' | 'reject' | 'request_clarification'
  comment: string
}
