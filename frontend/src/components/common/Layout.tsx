import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Megaphone, FileText, LogOut, Zap, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/campaigns', label: 'แคมเปญ', icon: Megaphone },
  { to: '/drafts', label: 'Review Drafts', icon: FileText },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#f1f3f6' }}>
      {/* Sidebar */}
      <aside className="w-60 bg-white flex flex-col shadow-card border-r border-gray-100 flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">LeadGen</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">เมนูหลัก</p>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-primary-100' : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Icon size={14} className={isActive ? 'text-primary-600' : 'text-gray-500'} />
                  </div>
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="text-primary-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors mb-0.5">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
