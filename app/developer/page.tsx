'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Code2, Globe, Mail, Edit3, Check, Loader2, Sparkles, Share2, Link as LinkIcon, Building2, CheckCircle2 } from 'lucide-react'

export default function DeveloperPage() {
  const [profile, setProfile] = useState<any>(null)
  const [devInfo, setDevInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Edit Fields
  const [companyName, setCompanyName] = useState('')
  const [founderName, setFounderName] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [facebook, setFacebook] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')

  const supabase = createClient()
  const isDevAuthorized = profile?.role === 'admin'

  useEffect(() => {
    fetchDevDetails()
  }, [])

  const fetchDevDetails = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (pData) setProfile(pData)
    }

    const { data: dData } = await supabase.from('developer_info').select('*').eq('id', 1).maybeSingle()
    if (dData) {
      setDevInfo(dData)
      setCompanyName(dData.company_name || 'Ceylon Digi Solutions')
      setFounderName(dData.founder_name || 'Kavindu Dilhara')
      setTitle(dData.title || 'System Architect & Software Engineer')
      setBio(dData.bio || 'Empowering digital transformation and enterprise workflow automation.')
      setEmail(dData.email || 'contact@ceylondigi.com')
      setWebsite(dData.website || '')
      setFacebook(dData.facebook || '')
      setLinkedin(dData.linkedin || '')
      setGithub(dData.github || '')
    }
    setLoading(false)
  }

  const handleSaveDeveloperInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('developer_info').upsert({
        id: 1,
        company_name: companyName,
        founder_name: founderName,
        title,
        bio,
        email,
        website,
        facebook,
        linkedin,
        github,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      setDevInfo({ ...devInfo, company_name: companyName, founder_name: founderName, title, bio, email, website, facebook, linkedin, github })
      setEditing(false)
      setMsg('Developer profile updated successfully!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update')
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
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading Developer Hub...</span>
      </div>
    )
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Code2 className="w-6 h-6 text-indigo-400" />
              Technical Architecture & Credits
            </h2>
            <p className="text-xs text-slate-500 mt-1">Official engineering and software development team credentials.</p>
          </div>

          {isDevAuthorized && !editing && (
            <Button
              onClick={() => setEditing(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 shadow-lg shadow-indigo-500/20 rounded-xl"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Edit Developer Profile
            </Button>
          )}
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-700/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {msg}
          </div>
        )}

        {editing ? (
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-white">Update Developer & Agency Profiles</h3>
              <p className="text-xs text-slate-500 mt-0.5">You are editing live developer metadata displayed to users across the system.</p>
            </div>
            <form onSubmit={handleSaveDeveloperInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Software Agency / Brand</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Founder / Lead Engineer</Label>
                  <Input
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Title / Designation</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Bio / Overview</Label>
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Official Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Website / Portfolio URL</Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Facebook URL</Label>
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">LinkedIn URL</Label>
                  <Input
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">GitHub URL</Label>
                  <Input
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1a2e4a]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="border-[#1a2e4a] text-slate-400 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-xl gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl md:col-span-2 p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 mb-2">
                    <Sparkles className="w-3 h-3" />
                    Official Software Architecture
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{devInfo?.company_name || 'Ceylon Digi Solutions'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{devInfo?.founder_name || 'Kavindu Dilhara'} — {devInfo?.title || 'System Architect'}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#04091a] p-4 rounded-xl border border-[#1a2e4a]">
                {devInfo?.bio || 'Empowering digital transformation and enterprise workflow automation.'}
              </p>

              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact & Social Links</h4>
                <div className="flex flex-wrap gap-2">
                  {devInfo?.website && (
                    <a
                      href={devInfo.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                    >
                      <Globe className="w-3.5 h-3.5 text-indigo-400" /> Website
                    </a>
                  )}
                  {devInfo?.facebook && (
                    <a
                      href={devInfo.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                    >
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" /> Facebook
                    </a>
                  )}
                  {devInfo?.linkedin && (
                    <a
                      href={devInfo.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-400" /> LinkedIn
                    </a>
                  )}
                  {devInfo?.github && (
                    <a
                      href={devInfo.github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                    >
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" /> GitHub
                    </a>
                  )}
                  {devInfo?.email && (
                    <a
                      href={`mailto:${devInfo.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-indigo-400" /> {devInfo.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">System Environment</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-[#04091a] border border-[#1a2e4a]">
                    <span className="text-slate-500">Framework</span>
                    <span className="text-slate-300 font-mono">Next.js 16 (App Router)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#04091a] border border-[#1a2e4a]">
                    <span className="text-slate-500">Database</span>
                    <span className="text-slate-300 font-mono">Supabase Postgres</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#04091a] border border-[#1a2e4a]">
                    <span className="text-slate-500">Document Engine</span>
                    <span className="text-slate-300 font-mono">pdf-lib / Canvas V2</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-[#04091a] border border-[#1a2e4a]">
                    <span className="text-slate-500">Security</span>
                    <span className="text-emerald-400 font-medium">QR HMAC Signed</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 text-center mt-4">
                © {new Date().getFullYear()} Ceylon Digi Solutions. All rights reserved.
              </p>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}