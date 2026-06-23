import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { generateReqId } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  Request, RequestFilters, CreateRequestPayload,
  ProposeChangesPayload, ActionPayload, RequestField, AuditLog, Comment
} from '@/types'

// ─── Fetch all requests with filters ─────────────────────────────────────────
export function useRequests(filters: Partial<RequestFilters> = {}) {
  return useQuery({
    queryKey: ['requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('requests')
        .select(`
          *,
          category:categories(id, name, sla_hours, fields),
          creator:users!created_by(id, name, email, avatar_url, role, team_id, team:teams(id,name)),
          hub:hubs(id, name, email, region)
        `)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all')
        query = query.eq('status', filters.status)
      if (filters.priority && filters.priority !== 'all')
        query = query.eq('priority', filters.priority)
      if (filters.category_id && filters.category_id !== 'all')
        query = query.eq('category_id', filters.category_id)
      if (filters.hub_id && filters.hub_id !== 'all')
        query = query.eq('hub_id', filters.hub_id)
      if (filters.date_from)
        query = query.gte('created_at', filters.date_from)
      if (filters.date_to)
        query = query.lte('created_at', filters.date_to + 'T23:59:59')
      if (filters.search) {
        query = query.or(
          `req_id.ilike.%${filters.search}%,title.ilike.%${filters.search}%,merchant_name.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data as Request[]
    },
    staleTime: 30_000,
  })
}

// ─── Fetch single request with full details ───────────────────────────────────
export function useRequest(id: string) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          category:categories(id, name, sla_hours, fields, team:teams(id,name)),
          creator:users!created_by(id, name, email, avatar_url, role, team:teams(id,name,group_emails)),
          hub:hubs(id, name, email, region)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Request
    },
    enabled: !!id,
  })
}

// ─── Fetch request fields ─────────────────────────────────────────────────────
export function useRequestFields(requestId: string) {
  return useQuery({
    queryKey: ['request-fields', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_fields')
        .select('*')
        .eq('request_id', requestId)
        .order('field_key')
      if (error) throw error
      return data as RequestField[]
    },
    enabled: !!requestId,
  })
}

// ─── Fetch audit log ──────────────────────────────────────────────────────────
export function useAuditLog(requestId: string) {
  return useQuery({
    queryKey: ['audit-log', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*, performer:users!performed_by(id, name, avatar_url)`)
        .eq('request_id', requestId)
        .order('timestamp', { ascending: true })
      if (error) throw error
      return data as AuditLog[]
    },
    enabled: !!requestId,
  })
}

// ─── Fetch comments ───────────────────────────────────────────────────────────
export function useComments(requestId: string) {
  return useQuery({
    queryKey: ['comments', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, user:users(id, name, avatar_url)`)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Comment[]
    },
    enabled: !!requestId,
  })
}

// ─── Create request mutation ──────────────────────────────────────────────────
export function useCreateRequest() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: CreateRequestPayload) => {
      if (!user) throw new Error('Not authenticated')

      const reqId = generateReqId()

      // Calculate due date from SLA
      let dueDate: string | null = null
      if (payload.category_id) {
        const { data: cat } = await supabase
          .from('categories')
          .select('sla_hours')
          .eq('id', payload.category_id)
          .single()
        if (cat?.sla_hours) {
          const d = new Date()
          d.setHours(d.getHours() + cat.sla_hours)
          dueDate = d.toISOString()
        }
      }

      // Insert request
      const { data: req, error: reqErr } = await supabase
        .from('requests')
        .insert({
          req_id: reqId,
          title: payload.title,
          category_id: payload.category_id,
          created_by: user.id,
          status: payload.is_draft ? 'draft' : 'pending',
          priority: payload.priority,
          hub_id: payload.hub_id,
          merchant_name: payload.merchant_name,
          description: payload.description,
          due_date: dueDate,
        })
        .select()
        .single()
      if (reqErr) throw reqErr

      // Insert fields
      if (payload.fields.length > 0) {
        const { error: fieldErr } = await supabase.from('request_fields').insert(
          payload.fields.map((f) => ({
            request_id: req.id,
            field_key: f.key,
            field_label: f.label,
            current_value: f.value,
          }))
        )
        if (fieldErr) throw fieldErr
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        request_id: req.id,
        action: payload.is_draft ? 'DRAFT_SAVED' : 'CREATED',
        performed_by: user.id,
        metadata: { req_id: reqId },
      })

      // Notify opposite team members if not draft
      if (!payload.is_draft) {
        await notifyOppositeTeam(req.id, user, 'new_request',
          `New requisition ${reqId}: ${payload.title}`)
      }

      return req
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success(vars.is_draft ? 'Draft saved' : 'Request submitted successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Update request fields (by reviewer — propose changes) ───────────────────
export function useProposeChanges() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: ProposeChangesPayload) => {
      if (!user) throw new Error('Not authenticated')

      // Update proposed values in request_fields
      for (const f of payload.changed_fields) {
        await supabase
          .from('request_fields')
          .update({ proposed_value: f.new_value })
          .eq('request_id', payload.request_id)
          .eq('field_key', f.key)

        // History
        await supabase.from('request_field_history').insert({
          request_id: payload.request_id,
          field_key: f.key,
          field_label: f.label,
          old_value: f.old_value,
          new_value: f.new_value,
          changed_by: user.id,
        })
      }

      // Change status to review_requested
      await supabase
        .from('requests')
        .update({ status: 'review_requested', updated_at: new Date().toISOString() })
        .eq('id', payload.request_id)

      // Add comment
      if (payload.comment) {
        await supabase.from('comments').insert({
          request_id: payload.request_id,
          user_id: user.id,
          message: payload.comment,
        })
      }

      await supabase.from('audit_logs').insert({
        request_id: payload.request_id,
        action: 'CHANGES_PROPOSED',
        performed_by: user.id,
        metadata: { changed_fields: payload.changed_fields },
      })

      await notifyOppositeTeam(payload.request_id, user, 'proposal_received',
        'Ops team proposed changes — please review')
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['request', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['request-fields', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['audit-log', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Changes proposed — awaiting creator review')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Take action (approve / reject / clarify) ────────────────────────────────
export function useRequestAction() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: ActionPayload) => {
      if (!user) throw new Error('Not authenticated')

      // Fetch current request to know context
      const { data: req } = await supabase
        .from('requests')
        .select('*, fields:request_fields(*)')
        .eq('id', payload.request_id)
        .single()

      let newStatus: string
      let auditAction: string

      if (payload.action === 'approve') {
        if (req?.status === 'review_requested') {
          // Creator accepting proposed changes → back to pending with new values
          await supabase
            .from('request_fields')
            .select('*')
            .eq('request_id', payload.request_id)
            .then(async ({ data: fields }) => {
              for (const f of fields || []) {
                if (f.proposed_value !== null && f.proposed_value !== undefined) {
                  await supabase
                    .from('request_fields')
                    .update({ current_value: f.proposed_value, proposed_value: null })
                    .eq('id', f.id)
                }
              }
            })
          newStatus = 'pending'
          auditAction = 'PROPOSAL_ACCEPTED'
        } else {
          newStatus = 'approved'
          auditAction = 'APPROVED'
        }
      } else if (payload.action === 'reject') {
        if (req?.status === 'review_requested') {
          // Creator rejecting proposal → clear proposed values, back to pending
          await supabase
            .from('request_fields')
            .update({ proposed_value: null })
            .eq('request_id', payload.request_id)
          newStatus = 'pending'
          auditAction = 'PROPOSAL_REJECTED'
        } else {
          newStatus = 'rejected'
          auditAction = 'REJECTED'
        }
      } else {
        newStatus = 'clarification_needed'
        auditAction = 'CLARIFICATION_REQUESTED'
      }

      await supabase
        .from('requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', payload.request_id)

      if (payload.comment) {
        await supabase.from('comments').insert({
          request_id: payload.request_id,
          user_id: user.id,
          message: payload.comment,
        })
      }

      await supabase.from('audit_logs').insert({
        request_id: payload.request_id,
        action: auditAction,
        performed_by: user.id,
        metadata: { comment: payload.comment, new_status: newStatus },
      })

      await notifyOppositeTeam(payload.request_id, user,
        payload.action === 'approve' ? 'status_changed' : 'status_changed',
        `Request ${auditAction.toLowerCase().replace(/_/g, ' ')}`)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['request', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['request-fields', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['audit-log', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['comments', vars.request_id] })
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Action taken successfully')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Add comment ──────────────────────────────────────────────────────────────
export function useAddComment() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('comments').insert({
        request_id: requestId,
        user_id: user.id,
        message,
      })
      if (error) throw error
      await supabase.from('audit_logs').insert({
        request_id: requestId,
        action: 'COMMENT_ADDED',
        performed_by: user.id,
        metadata: { message },
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.requestId] })
      qc.invalidateQueries({ queryKey: ['audit-log', vars.requestId] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Delete request (draft/pending, own only) ─────────────────────────────────
export function useDeleteRequest() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId)
        .eq('created_by', user.id)
        .in('status', ['draft', 'pending'])
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] })
      toast.success('Request deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Update request (creator, pending/draft only) ────────────────────────────
export function useUpdateRequest() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      requestId,
      updates,
      fields,
      comment,
    }: {
      requestId: string
      updates: Partial<{ title: string; priority: string; description: string; hub_id: string; merchant_name: string }>
      fields?: { key: string; label: string; value: string }[]
      comment: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      await supabase
        .from('requests')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', requestId)

      if (fields) {
        for (const f of fields) {
          await supabase
            .from('request_fields')
            .update({ current_value: f.value })
            .eq('request_id', requestId)
            .eq('field_key', f.key)
        }
      }

      if (comment) {
        await supabase.from('comments').insert({
          request_id: requestId,
          user_id: user.id,
          message: `[Update] ${comment}`,
        })
      }

      await supabase.from('audit_logs').insert({
        request_id: requestId,
        action: 'UPDATED',
        performed_by: user.id,
        metadata: { updates, comment },
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['request', vars.requestId] })
      qc.invalidateQueries({ queryKey: ['requests'] })
      qc.invalidateQueries({ queryKey: ['request-fields', vars.requestId] })
      toast.success('Request updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Helper: notify opposite team members ─────────────────────────────────────
async function notifyOppositeTeam(
  requestId: string,
  currentUser: { id: string; team_id: string | null },
  type: string,
  message: string
) {
  // Get all users not in the current team
  const { data: users } = await supabase
    .from('users')
    .select('id, team_id')
    .neq('team_id', currentUser.team_id)
    .eq('is_active', true)

  if (!users?.length) return

  await supabase.from('notifications').insert(
    users.map((u) => ({
      user_id: u.id,
      request_id: requestId,
      type,
      message,
    }))
  )
}
