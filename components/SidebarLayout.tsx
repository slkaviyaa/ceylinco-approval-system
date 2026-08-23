'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Code2, LogOut, Menu, Building2, Shield, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  children: React.ReactNode
  profile: any
  onSignOut: () => void
}

export default function SidebarLayout({ children, profile, onSignOut }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Document Clearance', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', href: '/profile', icon: User },
    { name: 'About Developers', href: '/developer', icon: Code2 },
  ]

  const getRoleBadge = () => {
    if (profile?.role === 'admin') return 'System Administrator'
    if (profile?.role === 'manager') return 'Branch Manager'
    if (profile?.role === 'counter') return `${profile?.counter_name || ''} Counter`
    return 'Staff'
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Top Brand */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Ceylinco VIP</h1>
              <p className="text-[10px] text-slate-400 mt-1">Approval Network</p>
            </div>
          </div>

          {/* User Quick Info */}
          <div className="p-4 border-b border-slate-800/60 bg-slate-800/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden font-bold text-blue-400">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Loading...'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[10px] text-slate-400 truncate">{getRoleBadge()}</span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="w-full border-slate-800 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <div className="text-center pt-2">
            <p className="text-[10px] text-slate-500 font-medium">Ceylon Digi Solutions</p>
          </div>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-white text-sm">Ceylinco VIP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-md border border-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  )
}