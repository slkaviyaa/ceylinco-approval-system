'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, CheckCircle2, XCircle, Loader2, FileText, Building2, Code2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

function VerificationContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (code) fetchVerification()
    else setLoading(false)
  }, [code])

  const fetchVerification = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('verification_code', code)
      .maybeSingle()
    if (data && !error) setDoc(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Verifying Document Authenticity...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#04091a] bg-grid flex flex-col items-center justify-between px-4 py-10">
      {/* Glow orbs */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full flex-1 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Ceylinco VIP</h1>
              <p className="text-[10px] text-indigo-400">Approval Network</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 text-center border-b border-[#1a2e4a] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-transparent" />
              <div className={`relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                doc ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-rose-500/10 border border-rose-500/25'
              }`}>
                <ShieldCheck className={`w-7 h-7 ${doc ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <h2 className="relative text-lg font-bold text-white">Document Verification</h2>
              <p className="relative text-xs text-slate-500 mt-1">Dehiattakandiya Branch · VIP Counter Network</p>
            </div>

            <div className="p-5">
              {doc ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-700/30 text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Authentic Document Verified</p>
                      <p className="text-[11px] text-emerald-400/70 mt-0.5">Digitally endorsed and certified by Branch Management.</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-[#04091a] rounded-xl border border-[#1a2e4a] divide-y divide-[#0f1e33]">
                    {[
                      { label: 'Title / Policy', value: doc.title, cls: 'text-white font-semibold' },
                      { label: 'Category', value: doc.category || 'General', cls: 'text-slate-300' },
                      { label: 'Originating Unit', value: `${doc.counter_name} Counter`, cls: 'text-indigo-300 font-medium' },
                      { label: 'Endorsement', value: null, badge: doc.stamp_type || 'APPROVED' },
                      { label: 'Processed', value: format(new Date(doc.updated_at || doc.created_at), 'dd MMM yyyy, h:mm a'), cls: 'text-slate-300' },
                      { label: 'Verification Code', value: doc.verification_code, cls: 'font-mono text-xs text-indigo-400' },
                    ].map(({ label, value, cls, badge }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5 text-xs">
                        <span className="text-slate-500">{label}</span>
                        {badge
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">{badge}</span>
                          : <span className={cls}>{value}</span>}
                      </div>
                    ))}
                  </div>

                  {doc.signed_file_url && (
                    <a
                      href={doc.signed_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-500/20"
                    >
                      <FileText className="w-4 h-4" />
                      View Certified Copy
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <XCircle className="w-7 h-7 text-rose-400" />
                  </div>
                  <p className="text-slate-200 font-semibold">Invalid Document Code</p>
                  <p className="text-xs text-slate-500">
                    {code
                      ? 'The requested record does not exist or has been revoked.'
                      : 'No verification code provided. Scan the QR code on the document.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-700 space-y-1 pt-8">
        <div className="flex items-center justify-center gap-1.5 text-slate-500">
          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
          Secured by <strong className="text-indigo-400">Ceylon Digi Solutions</strong>
        </div>
        <p className="text-slate-700">Founder: Kavindu Dilhara · Enterprise Digital Transformation</p>
      </footer>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading...</span>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  )
}