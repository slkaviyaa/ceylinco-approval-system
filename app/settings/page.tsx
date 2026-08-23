'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sliders, Save, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Settings State
  const [sigPos, setSigPos] = useState('bottom-right')
  const [commentPos, setCommentPos] = useState('below-signature')
  const [includeDt, setIncludeDt] = useState(true)
  const [dtPos, setDtPos] = useState('under-signature')
  const [includeQr, setIncludeQr] = useState(true)
  const [watermark, setWatermark] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (pData) setProfile(pData)

    const { data: sData } = await supabase.from('approval_settings').select('*').eq('id', 1).single()
    if (sData) {
      setSigPos(sData.signature_position || 'bottom-right')
      setCommentPos(sData.comment_position || 'below-signature')
      setIncludeDt(sData.include_datetime ?? true)
      setDtPos(sData.datetime_position || 'under-signature')
      setIncludeQr(sData.include_qr ?? true)
      setWatermark(sData.include_watermark ?? true)
    }
    setLoading(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    try {
      const { error } = await supabase.from('approval_settings').upsert({
        id: 1,
        signature_position: sigPos,
        comment_position: commentPos,
        include_datetime: includeDt,
        datetime_position: dtPos,
        include_qr: includeQr,
        include_watermark: watermark,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setMsg('Approval stamp layout settings updated successfully!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Loading Settings...</span>
      </div>
    )
  }

  const isPrivileged = profile?.role === 'manager' || profile?.role === 'admin'

  if (!isPrivileged) {
    return (
      <SidebarLayout profile={profile} onSignOut={handleSignOut}>
        <div className="max-w-xl mx-auto mt-20 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-400">Only Branch Managers and System Administrators can configure approval stamp settings.</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-500" />
            Approval & Stamp Layout Settings
          </h2>
          <p className="text-sm text-slate-400">Configure how digital signatures, remarks, timestamps, and QR codes appear on certified PDF documents.</p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-white">PDF Stamping Customization</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Changes applied here will reflect across all future branch approvals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Signature Position */}
              <div className="space-y-2">
                <Label className="text-slate-200 text-xs font-semibold">Digital Signature Position</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'bottom-right', label: 'Bottom Right (Standard)' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'top-right', label: 'Top Right' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSigPos(item.id)}
                      className={`p-3 rounded-lg border text-xs font-medium text-left transition ${
                        sigPos === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment / Remarks Position */}
              <div className="space-y-2">
                <Label className="text-slate-200 text-xs font-semibold">Manager Remarks / Comment Position</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'below-signature', label: 'Below Signature' },
                    { id: 'above-signature', label: 'Above Signature' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCommentPos(item.id)}
                      className={`p-3 rounded-lg border text-xs font-medium text-left transition ${
                        commentPos === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Toggle & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-200 text-xs font-semibold">Include Timestamp (Date & Time)</Label>
                    <input
                      type="checkbox"
                      checked={includeDt}
                      onChange={(e) => setIncludeDt(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Append endorsement timestamp on certified document.</p>
                </div>

                {includeDt && (
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Timestamp Placement</Label>
                    <select
                      value={dtPos}
                      onChange={(e) => setDtPos(e.target.value)}
                      className="w-full h-9 px-3 rounded bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="under-signature">Directly Under Signature</option>
                      <option value="attached-to-comment">Attached to Manager Comment</option>
                    </select>
                  </div>
                )}
              </div>

              {/* QR Code & Watermark Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <Label className="text-slate-200 text-xs font-semibold">Include QR Verification Code</Label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Generate scannable online authentication QR.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeQr}
                    onChange={(e) => setIncludeQr(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <Label className="text-slate-200 text-xs font-semibold">Include Agency Watermark</Label>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ceylon Digi Solutions footer credit watermark.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={watermark}
                    onChange={(e) => setWatermark(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Save Layout Configuration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  )
}