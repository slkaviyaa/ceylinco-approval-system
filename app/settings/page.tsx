'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sliders, Save, Loader2, CheckCircle2, ShieldAlert, QrCode, Clock, Droplets, Layout } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [sigPos, setSigPos] = useState('bottom-right')
  const [commentPos, setCommentPos] = useState('below-signature')
  const [includeDt, setIncludeDt] = useState(true)
  const [dtPos, setDtPos] = useState('under-signature')
  const [includeQr, setIncludeQr] = useState(true)
  const [watermark, setWatermark] = useState(true)

  const supabase = createClient()

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

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
      setMsg('Stamp layout settings saved successfully!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to save settings')
    } finally { setSaving(false) }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading Settings...</span>
      </div>
    )
  }

  const isPrivileged = profile?.role === 'manager' || profile?.role === 'admin'

  if (!isPrivileged) {
    return (
      <SidebarLayout profile={profile} onSignOut={handleSignOut}>
        <div className="max-w-md mx-auto mt-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-500">Only Branch Managers and System Administrators can configure stamp settings.</p>
        </div>
      </SidebarLayout>
    )
  }

  const ToggleCard = ({ label, desc, checked, onChange }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#04091a] border border-[#1a2e4a]">
      <div>
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-[#1a2e4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    </div>
  )

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            Approval Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure how stamps, signatures, and QR codes appear on certified PDF documents.
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-700/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Signature Position */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Layout className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Signature Position</h3>
                <p className="text-[11px] text-slate-500">Default placement when no drag position is set.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bottom-right', label: 'Bottom Right', hint: 'Standard' },
                { id: 'bottom-left', label: 'Bottom Left', hint: '' },
                { id: 'top-right', label: 'Top Right', hint: '' },
              ].map((item) => (
                <button key={item.id} type="button" onClick={() => setSigPos(item.id)}
                  className={`p-3 rounded-xl border text-xs text-left transition-all ${
                    sigPos === item.id
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#04091a] border-[#1a2e4a] text-slate-400 hover:border-[#243654]'
                  }`}>
                  <p className="font-semibold">{item.label}</p>
                  {item.hint && <p className="text-[10px] text-slate-500 mt-0.5">{item.hint}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Remark Position */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Manager Remarks Position</h3>
                <p className="text-[11px] text-slate-500">Where manager notes appear relative to the signature.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'below-signature', label: 'Below Signature' },
                { id: 'above-signature', label: 'Above Signature' },
              ].map((item) => (
                <button key={item.id} type="button" onClick={() => setCommentPos(item.id)}
                  className={`p-3 rounded-xl border text-xs text-left transition-all ${
                    commentPos === item.id
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : 'bg-[#04091a] border-[#1a2e4a] text-slate-400 hover:border-[#243654]'
                  }`}>
                  <p className="font-semibold">{item.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Timestamp */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Timestamp</h3>
                <p className="text-[11px] text-slate-500">Endorsement date & time on the certified document.</p>
              </div>
            </div>
            <ToggleCard
              label="Include Timestamp"
              desc="Append date & time of endorsement to the document."
              checked={includeDt}
              onChange={setIncludeDt}
            />
            {includeDt && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Timestamp Placement</Label>
                <select value={dtPos} onChange={(e) => setDtPos(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-white text-xs outline-none focus:border-indigo-500/50">
                  <option value="under-signature">Directly Under Signature</option>
                  <option value="attached-to-comment">Attached to Manager Comment</option>
                </select>
              </div>
            )}
          </div>

          {/* QR & Watermark */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">QR Code & Watermark</h3>
              </div>
            </div>
            <div className="space-y-2">
              <ToggleCard
                label="QR Verification Code"
                desc="Embed a scannable QR code linking to the verification page."
                checked={includeQr}
                onChange={setIncludeQr}
              />
              <ToggleCard
                label="Agency Watermark"
                desc="Show 'Certified via Ceylinco VIP Approval Network' footer text."
                checked={watermark}
                onChange={setWatermark}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs h-10 rounded-xl gap-2 px-6 shadow-lg shadow-indigo-500/20">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Configuration
          </Button>
        </form>
      </div>
    </SidebarLayout>
  )
}