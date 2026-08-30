'use client'

import Link from 'next/link'
import { Building2, ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#04091a] px-4 py-8 bg-grid">
      <div className="w-full max-w-md bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Closed Registration</h2>
          <p className="text-xs text-slate-400">
            Public user self-registration is disabled for security and regulatory compliance.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-left space-y-2 text-xs text-slate-300">
          <p className="font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Branch Staff & Counters
          </p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Your login account must be provisioned directly by your <strong>Branch Administrator</strong> via the system Admin panel.
          </p>
        </div>

        <Link href="/login" className="block">
          <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs h-10 rounded-xl gap-2 shadow-lg shadow-indigo-500/20">
            <ArrowLeft className="w-4 h-4" />
            Back to Portal Login
          </Button>
        </Link>
      </div>
    </div>
  )
}