'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Code2, Globe, Mail, Edit3, Check, Loader2, Sparkles, Share2, Link as LinkIcon } from 'lucide-react'

export default function DeveloperPage() {
  const [profile, setProfile] = useState<any>(null)
  const [devInfo, setDevInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

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
  const isDevAuthorized = profile?.role === 'admin' || profile?.username === 'kavindu' || profile?.email?.includes('kavindu')

  useEffect(() => {
    fetchDevDetails()
  }, [])

  const fetchDevDetails = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (pData) setProfile(pData)
    }

    const { data: dData } = await supabase.from('developer_info').select('*').eq('id', 1).single()
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
      alert('Developer information updated successfully!')
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Loading Developer Hub...</span>
      </div>
    )
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Code2 className="w-6 h-6 text-blue-500" />
              About Engineering & Architecture
            </h2>
            <p className="text-sm text-slate-400">Official technical architecture and development credits.</p>
          </div>

          {isDevAuthorized && !editing && (
            <Button
              onClick={() => setEditing(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 shadow"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Edit Developer Profiles
            </Button>
          )}
        </div>

        {editing ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-white">Update Developer & Agency Profiles</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                You are editing live developer metadata displayed to users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveDeveloperInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Software Agency / Brand Name</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Founder / Lead Engineer</Label>
                    <Input
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Title / Role</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Bio / Overview</Label>
                  <Input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Official Email</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Portfolio / Website Link</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Facebook URL</Label>
                    <Input
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">LinkedIn URL</Label>
                    <Input
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">GitHub URL</Label>
                    <Input
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    className="border-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border-slate-800 md:col-span-2 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs mb-2">
                    Official Software Architecture
                  </Badge>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{devInfo?.company_name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{devInfo?.founder_name} — {devInfo?.title}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
                {devInfo?.bio}
              </p>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Contact & Social Links</h4>
                <div className="flex flex-wrap gap-2">
                  {devInfo?.website && (
                    <a
                      href={devInfo.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500 transition"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400" /> Website
                    </a>
                  )}
                  {devInfo?.facebook && (
                    <a
                      href={devInfo.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500 transition"
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-400" /> Facebook
                    </a>
                  )}
                  {devInfo?.linkedin && (
                    <a
                      href={devInfo.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500 transition"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-blue-400" /> LinkedIn
                    </a>
                  )}
                  {devInfo?.github && (
                    <a
                      href={devInfo.github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500 transition"
                    >
                      <Code2 className="w-3.5 h-3.5 text-blue-400" /> GitHub
                    </a>
                  )}
                  {devInfo?.email && (
                    <a
                      href={`mailto:${devInfo.email}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-blue-500 transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-400" /> {devInfo.email}
                    </a>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}