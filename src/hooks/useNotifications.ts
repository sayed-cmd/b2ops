import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { toast } from 'sonner'
import type { Notification } from '@/types'

export function useNotifications() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('notifications')
        .select(`*, request:requests(id, req_id, title, status)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!user,
  })

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['notifications', user.id] })
          toast.info((payload.new as Notification).message, { duration: 4000 })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, qc])

  const unreadCount = query.data?.filter((n) => !n.is_read).length ?? 0

  return { ...query, unreadCount }
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (notificationId: string | 'all') => {
      if (!user) return
      if (notificationId === 'all') {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
      } else {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  })
}
