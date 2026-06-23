import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications'
import { cn, formatRelative } from '@/lib/utils'
import { Button } from '@/components/ui'
import type { Notification } from '@/types'

const TYPE_ICON: Record<string, string> = {
  new_request: '📋',
  status_changed: '🔄',
  proposal_received: '✏️',
  proposal_accepted: '✅',
  proposal_rejected: '❌',
  comment_added: '💬',
  clarification_needed: '❓',
  sla_breach: '⚠️',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: notifications = [], unreadCount } = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = (n: Notification) => {
    markRead(n.id)
    if (n.request_id) navigate(`/requests/${n.request_id}`)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
      >
        <Bell className="h-4 w-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Notifications {unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-slate-500"
                onClick={() => markRead('all')}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                    !n.is_read && 'bg-blue-50/50'
                  )}
                >
                  <span className="mt-0.5 text-base shrink-0">
                    {TYPE_ICON[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !n.is_read ? 'text-slate-900 font-medium' : 'text-slate-600')}>
                      {n.message}
                    </p>
                    {n.request && (
                      <p className="text-[11px] text-blue-600 font-mono mt-0.5">{n.request.req_id}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatRelative(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
