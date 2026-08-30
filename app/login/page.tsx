'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, ShieldCheck, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.replace('/dashboard')
      }
    })
  }, [supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const cleanInput = identifier.trim().toLowerCase()
    const loginEmail = cleanInput.includes('@')
      ? cleanInput
      : `${cleanInput.replace(/\s+/g, '')}@counter.ceylinco.lk`

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })
      if (error) throw new Error(error.message || 'Invalid credentials.')
      if (data?.session) {
        window.location.replace('/dashboard')
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex bg-[#04091a]">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-start justify-between p-12 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-indigo-900/40 to-[#04091a]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Ceylinco VIP</h1>
            <p className="text-xs text-indigo-400">Approval Network</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Document Clearance<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Made Seamless.
              </span>
            </h2>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-sm">
              Submit, track and endorse branch documents digitally — with QR-verified signatures and real-time status updates.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '🔒', text: 'Role-based access for counter staff, managers & admins' },
              { icon: '✍️', text: 'Manager digital signature embedded into certified PDF' },
              { icon: '📲', text: 'QR code verification for document authenticity' },
              { icon: '⚡', text: 'Real-time queue updates across all branch counters' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">{f.icon}</span>
                <p className="text-xs text-slate-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-[11px] text-slate-600">
            Designed & Developed by{' '}
            <span className="text-indigo-400 font-semibold">Ceylon Digi Solutions</span>
          </p>
          <p className="text-[10px] text-slate-700 mt-0.5">
            System Architecture: Kavindu Dilhara (Founder)
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile brand */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Ceylinco VIP</span>
        </div>

        <div className="w-full max-w-sm space-y-7">
          {/* Header */}
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to your branch portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-400 text-xs flex items-center gap-2">
                <span className="shrink-0">⚠</span>
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username or Email</Label>
              <Input
                type="text"
                placeholder="e.g. mahaoya / siripura"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="h-11 bg-[#0b1525] border-[#1a2e4a] text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-[#0b1525] border-[#1a2e4a] text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing In...</>
              ) : (
                <><span>Sign In to Portal</span><ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-[11px] text-slate-700">
            Staff accounts are created by your Branch Administrator.
          </p>
        </div>
      </div>
    </div>
  )
}