import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { Avatar } from '@/components/ui'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Zap,
  Users,
  Building2,
  Tag,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/requests', label: 'Requests', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

const adminItems = [
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/teams', label: 'Teams', icon: Building2 },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/hubs', label: 'Hubs', icon: Building2 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(false)

  const isAdmin = user?.role === 'admin'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-white border-r border-slate-200 transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 tracking-tight">B2OPS</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              Portal
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 rounded-md hover:bg-slate-100"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
            <Avatar src={user?.avatar_url} name={user?.name || 'User'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.team?.name || 'No team'}</p>
            </div>
            <span className={cn(
              'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded',
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              user?.role === 'manager' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            )}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div className="pt-4">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className="flex items-center justify-between w-full px-2 mb-2"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Admin
                </p>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 text-slate-400 transition-transform',
                    adminExpanded && 'rotate-180'
                  )}
                />
              </button>
              {adminExpanded &&
                adminItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-purple-50 text-purple-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn('h-4 w-4', isActive ? 'text-purple-600' : 'text-slate-400')} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
            </div>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 h-16 px-6 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
