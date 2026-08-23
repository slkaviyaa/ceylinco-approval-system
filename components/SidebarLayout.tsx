'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  User, 
  Code2, 
  LogOut, 
  Menu, 
  Building2, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Layers,
  Sliders,
  DownloadCloud
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
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  const getRoleBadge = () => {
    if (profile?.role === 'admin') return 'System Administrator'
    if (profile?.role === 'manager') return 'Branch Manager'
    if (profile?.role === 'counter') return `${profile?.counter_name || ''} Counter`
    return 'Staff'
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Ceylinco VIP</h1>
              <p className="text-[10px] text-blue-400 font-medium">Approval Network</p>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="p-3 m-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center overflow-hidden font-bold text-blue-400 shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Loading...'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[10px] text-slate-400 truncate">{getRoleBadge()}</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-2 space-y-5 flex-1">
            {/* My Submissions */}
            <div>
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                My Submissions
              </p>
              <div className="space-y-1">
                <Link
                  href="/dashboard?view=my-pending"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'my-pending'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>My Pending</span>
                </Link>

                <Link
                  href="/dashboard?view=my-approved"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'my-approved'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>My Approved</span>
                </Link>

                <Link
                  href="/dashboard?view=my-rejected"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'my-rejected'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>My Rejected</span>
                </Link>

                <Link
                  href="/dashboard?view=my-all"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'my-all'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>All My Submissions</span>
                </Link>
              </div>
            </div>

            {/* Branch Queues */}
            <div>
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                Branch Directory
              </p>
              <div className="space-y-1">
                <Link
                  href="/dashboard?view=branch-pending"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'branch-pending'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>All Pending</span>
                </Link>

                <Link
                  href="/dashboard?view=branch-approved"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'branch-approved'
                      ? 'bg-emerald-700 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>All Approved</span>
                </Link>

                <Link
                  href="/dashboard?view=branch-rejected"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'branch-rejected'
                      ? 'bg-rose-700 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                  <span>All Rejected</span>
                </Link>

                <Link
                  href="/dashboard?view=branch-all"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/dashboard' && currentView === 'branch-all'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span>All Submitted Docs</span>
                </Link>
              </div>
            </div>

            {/* General Settings */}
            <div>
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                Settings
              </p>
              <div className="space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>User Profile</span>
                </Link>

                <Link
                  href="/developer"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/developer' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 shrink-0" />
                  <span>About Developers</span>
                </Link>

                {isManagerOrAdmin && (
                  <Link
                    href="/settings"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      pathname === '/settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 shrink-0" />
                    <span>Approval Settings</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0 space-y-2">
            {isInstallable && (
              <Button
                type="button"
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 justify-start"
              >
                <DownloadCloud className="w-3.5 h-3.5 mr-2" />
                Install Ceylinco App
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="w-full border-slate-800 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs justify-start h-8"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </Button>
            <p className="text-[10px] text-center text-slate-500 font-medium">Ceylon Digi Solutions</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  )
}