'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  User, Code2, LogOut, Menu, Building2, Shield, Clock,
  CheckCircle2, XCircle, FileText, Layers, Sliders, DownloadCloud, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SidebarLayout({ children, profile, onSignOut }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'my-pending'
  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstallable(false)
    setDeferredPrompt(null)
  }

  const getRoleBadge = () => {
    if (profile?.role === 'admin') return { label: 'System Admin', cls: 'text-violet-300 bg-violet-500/10 border-violet-500/25' }
    if (profile?.role === 'manager') return { label: 'Branch Manager', cls: 'text-blue-300 bg-blue-500/10 border-blue-500/25' }
    if (profile?.role === 'counter') return { label: `${profile?.counter_name || ''} Counter`, cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' }
    return { label: 'Staff', cls: 'text-slate-300 bg-slate-500/10 border-slate-500/25' }
  }
  const roleBadge = getRoleBadge()

  const isViewActive = (view: string) => pathname === '/dashboard' && currentView === view
  const isPageActive = (page: string) => pathname === page

  const NavItem = ({
    href, icon: Icon, label, active, activeClass, iconClass
  }: {
    href: string; icon: any; label: string; active: boolean; activeClass: string; iconClass: string
  }) => (
    <Link
      href={href}
      onClick={() => setSidebarOpen(false)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 ${
        active
          ? `${activeClass}`
          : 'text-slate-500 hover:bg-[#0d1a30] hover:text-slate-200'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? '' : iconClass}`} />
      {label}
    </Link>
  )

  return (
    <div className="flex h-screen h-[100dvh] bg-[#04091a] text-slate-100 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#060c1c] border-r border-[#152035] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">

          {/* Brand */}
          <div className="relative h-14 flex items-center gap-3 px-4 shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-indigo-900/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="relative">
              <h1 className="text-[13px] font-bold text-white leading-tight tracking-tight">Ceylinco VIP</h1>
              <p className="text-[10px] text-indigo-400 font-medium">Approval Network</p>
            </div>
            {sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="relative ml-auto lg:hidden text-slate-600 hover:text-slate-300 p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User Card */}
          <div className="mx-3 mt-3 mb-1 p-2.5 rounded-xl bg-[#0b1525] border border-[#1a2e4a] flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-800 to-blue-900 border border-indigo-600/30 flex items-center justify-center overflow-hidden font-bold text-indigo-300 text-xs shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                : (profile?.full_name?.charAt(0) || 'U')}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">{profile?.full_name || '—'}</p>
              <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-px rounded-full text-[9px] font-semibold border ${roleBadge.cls}`}>
                <Shield className="w-2 h-2" />
                {roleBadge.label}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-2 py-2 space-y-3 flex-1">
            {/* My Submissions */}
            <div>
              <p className="px-3 text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-1">My Submissions</p>
              <div className="space-y-0.5">
                <NavItem href="/dashboard?view=my-pending" icon={Clock} label="My Pending"
                  active={isViewActive('my-pending')}
                  activeClass="bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  iconClass="text-amber-600" />
                <NavItem href="/dashboard?view=my-approved" icon={CheckCircle2} label="My Approved"
                  active={isViewActive('my-approved')}
                  activeClass="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  iconClass="text-emerald-600" />
                <NavItem href="/dashboard?view=my-rejected" icon={XCircle} label="My Rejected"
                  active={isViewActive('my-rejected')}
                  activeClass="bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  iconClass="text-rose-600" />
                <NavItem href="/dashboard?view=my-all" icon={Layers} label="All My Docs"
                  active={isViewActive('my-all')}
                  activeClass="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  iconClass="text-indigo-600" />
              </div>
            </div>

            {/* Branch Directory */}
            <div>
              <p className="px-3 text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-1">Branch Directory</p>
              <div className="space-y-0.5">
                <NavItem href="/dashboard?view=branch-pending" icon={Clock} label="All Pending"
                  active={isViewActive('branch-pending')}
                  activeClass="bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  iconClass="text-amber-600" />
                <NavItem href="/dashboard?view=branch-approved" icon={CheckCircle2} label="All Approved"
                  active={isViewActive('branch-approved')}
                  activeClass="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  iconClass="text-emerald-600" />
                <NavItem href="/dashboard?view=branch-rejected" icon={XCircle} label="All Rejected"
                  active={isViewActive('branch-rejected')}
                  activeClass="bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  iconClass="text-rose-600" />
                <NavItem href="/dashboard?view=branch-all" icon={FileText} label="All Submitted"
                  active={isViewActive('branch-all')}
                  activeClass="bg-slate-500/10 text-slate-300 border border-slate-500/20"
                  iconClass="text-slate-600" />
              </div>
            </div>

            {/* Account */}
            <div>
              <p className="px-3 text-[9px] font-bold tracking-widest text-slate-600 uppercase mb-1">Account</p>
              <div className="space-y-0.5">
                <NavItem href="/profile" icon={User} label="User Profile"
                  active={isPageActive('/profile')}
                  activeClass="bg-blue-500/10 text-blue-300 border border-blue-500/20"
                  iconClass="text-blue-600" />
                <NavItem href="/developer" icon={Code2} label="About Developers"
                  active={isPageActive('/developer')}
                  activeClass="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  iconClass="text-indigo-600" />
                {isManagerOrAdmin && (
                  <NavItem href="/settings" icon={Sliders} label="Approval Settings"
                    active={isPageActive('/settings')}
                    activeClass="bg-violet-500/10 text-violet-300 border border-violet-500/20"
                    iconClass="text-violet-600" />
                )}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-2.5 border-t border-[#152035] space-y-1.5 shrink-0">
            {isInstallable && (
              <Button type="button" onClick={handleInstallClick}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] h-8 justify-start gap-2">
                <DownloadCloud className="w-3.5 h-3.5" />
                Install App
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onSignOut}
              className="w-full border-[#1a2e4a] bg-transparent hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 text-[11px] justify-start h-8 gap-2">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
            <p className="text-[9px] text-center text-slate-700 pt-0.5">© Ceylon Digi Solutions</p>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="h-13 flex items-center justify-between px-4 border-b border-[#152035] bg-[#060c1c]/80 backdrop-blur-md lg:hidden shrink-0 h-12">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Ceylinco VIP</span>
          </div>
          <button onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg border border-[#1a2e4a] hover:bg-[#0b1525] transition">
            <Menu className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#04091a] bg-grid">
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}