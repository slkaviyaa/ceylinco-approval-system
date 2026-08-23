'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, CheckCircle2, XCircle, Loader2, FileText, Code2 } from 'lucide-react'
import { format } from 'date-fns'

function VerificationContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (code) {
      fetchVerification()
    } else {
      setLoading(false)
    }
  }, [code])

  const fetchVerification = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('verification_code', code)
      .maybeSingle()

    if (data && !error) {
      setDoc(data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Verifying Document Authenticity...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-slate-950 px-4 py-8">
      <div className="w-full flex-1 flex items-center justify-center">
        <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center mb-1">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Ceylinco Document Verification
            </CardTitle>
            <CardDescription className="text-slate-400">
              Dehiattakandiya Branch & VIP Counter Network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {doc ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Authentic Document Verified</p>
                    <p className="text-xs text-emerald-400/80">Digitally processed and certified by Branch Management.</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Title / Policy:</span>
                    <span className="font-medium text-white">{doc.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-slate-200">{doc.category || 'General'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Originating Unit:</span>
                    <span className="text-blue-400 font-medium">{doc.counter_name} Counter</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Endorsement Type:</span>
                    <Badge className="bg-emerald-600 text-white text-xs">{doc.stamp_type || 'APPROVED'}</Badge>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Processed Date:</span>
                    <span className="text-slate-300">{format(new Date(doc.updated_at || doc.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">Verification Code:</span>
                    <span className="font-mono text-xs text-blue-400">{doc.verification_code}</span>
                  </div>
                </div>

                {doc.signed_file_url && (
                  <a
                    href={doc.signed_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition"
                  >
                    <FileText className="w-4 h-4" /> View Certified Copy
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <p className="text-slate-300 font-medium">Invalid or Unverified Document Code</p>
                <p className="text-xs text-slate-500">The requested record does not exist or has been revoked.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-500 space-y-1 pt-6">
        <div className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
          <Code2 className="w-4 h-4 text-blue-500" />
          <span>Powered & Secured by <strong className="text-blue-400 font-semibold">Ceylon Digi Solutions</strong></span>
        </div>
        <p className="text-[11px] text-slate-500">
          Founder: <strong className="text-slate-300">Kavindu Dilhara</strong> • Enterprise Digital Transformation
        </p>
      </footer>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Loading...</span>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  )
}