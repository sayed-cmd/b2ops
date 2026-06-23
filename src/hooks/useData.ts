import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { toast } from 'sonner'
import type { Category, Hub, User, Team, DashboardStats } from '@/types'

// ─── Categories ───────────────────────────────────────────────────────────────
export function useCategories(teamId?: string) {
  return useQuery({
    queryKey: ['categories', teamId],
    queryFn: async () => {
      let q = supabase
        .from('categories')
        .select('*, team:teams(id,name)')
        .eq('is_active', true)
        .order('name')
      if (teamId) q = q.eq('team_id', teamId)
      const { data, error } = await q
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useAllCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*, team:teams(id,name)')
        .order('name')
      if (error) throw error
      return data as Category[]
    },
  })
}

export function useUpsertCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Category> & { id?: string }) => {
      const { id, ...rest } = payload
      if (id) {
        const { error } = await supabase.from('categories').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(rest)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Hubs ─────────────────────────────────────────────────────────────────────
export function useHubs() {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Hub[]
    },
    staleTime: 60_000,
  })
}

export function useUpsertHub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Hub> & { id?: string }) => {
      const { id, ...rest } = payload
      if (id) {
        const { error } = await supabase.from('hubs').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('hubs').insert(rest)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hubs'] })
      toast.success('Hub saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Teams ────────────────────────────────────────────────────────────────────
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name')
      if (error) throw error
      return data as Team[]
    },
    staleTime: 60_000,
  })
}

export function useUpsertTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Team> & { id?: string }) => {
      const { id, ...rest } = payload
      if (id) {
        const { error } = await supabase.from('teams').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('teams').insert(rest)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Users ────────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, team:teams(id,name)')
        .order('name')
      if (error) throw error
      return data as User[]
    },
    staleTime: 60_000,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  const { refreshUser } = useAuth()
  return useMutation({
    mutationFn: async (payload: Partial<User> & { id: string }) => {
      const { id, ...rest } = payload
      const { error } = await supabase.from('users').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      refreshUser()
      toast.success('User updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export function useDashboardStats(teamId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', teamId],
    queryFn: async (): Promise<DashboardStats> => {
      let q = supabase.from('requests').select('status, due_date, created_at, updated_at')
      if (teamId) {
        // Get users in team first
        const { data: teamUsers } = await supabase
          .from('users')
          .select('id')
          .eq('team_id', teamId)
        const userIds = teamUsers?.map((u) => u.id) || []
        q = q.in('created_by', userIds)
      }
      const { data, error } = await q
      if (error) throw error

      const now = new Date()
      const total = data.length
      const pending = data.filter((r) => r.status === 'pending').length
      const approved = data.filter((r) => r.status === 'approved').length
      const rejected = data.filter((r) => r.status === 'rejected').length
      const review_requested = data.filter((r) => r.status === 'review_requested').length
      const sla_breached = data.filter(
        (r) => r.due_date && new Date(r.due_date) < now && !['approved', 'rejected'].includes(r.status)
      ).length

      const completedRequests = data.filter((r) => r.status === 'approved' || r.status === 'rejected')
      const avg_turnaround_hours =
        completedRequests.length > 0
          ? completedRequests.reduce((acc, r) => {
              const diff = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()
              return acc + diff / 3_600_000
            }, 0) / completedRequests.length
          : 0

      return { total, pending, approved, rejected, review_requested, sla_breached, avg_turnaround_hours }
    },
  })
}

// ─── Monthly trend ────────────────────────────────────────────────────────────
export function useMonthlyTrend() {
  return useQuery({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)

      const { data, error } = await supabase
        .from('requests')
        .select('status, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())

      if (error) throw error

      const months: Record<string, { month: string; total: number; approved: number; rejected: number }> = {}
      data.forEach((r) => {
        const key = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (!months[key]) months[key] = { month: key, total: 0, approved: 0, rejected: 0 }
        months[key].total++
        if (r.status === 'approved') months[key].approved++
        if (r.status === 'rejected') months[key].rejected++
      })
      return Object.values(months)
    },
  })
}

// ─── Merchant suggestions ─────────────────────────────────────────────────────
export function useMerchantSuggestions(search: string) {
  return useQuery({
    queryKey: ['merchants', search],
    queryFn: async () => {
      if (!search || search.length < 2) return []
      const { data } = await supabase
        .from('requests')
        .select('merchant_name')
        .ilike('merchant_name', `%${search}%`)
        .limit(8)
      const unique = [...new Set(data?.map((r) => r.merchant_name).filter(Boolean))]
      return unique
    },
    enabled: search.length >= 2,
    staleTime: 10_000,
  })
}
