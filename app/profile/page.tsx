'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User, Camera, Trash2, Loader2, Save, Users, CheckCircle2,
  PenTool, Upload, ShieldAlert, UserPlus, Key
} from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const [msg, setMsg] = useState('')

  const [fullName, setFullName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  // Admin create-user form
  const [newUsername, setNewUsername] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('counter')
  const [newCounterName, setNewCounterName] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [createMsg, setCreateMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => { fetchProfileData() }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (pData) {
      setProfile(pData)
      setFullName(pData.full_name || '')
      setBirthday(pData.birthday || '')
      setPhone(pData.phone || '')
      setAddress(pData.address || '')

      if (pData.role === 'admin') {
        const { data: list } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (list) setAllProfiles(list)
      }
    }
    setLoading(false)
  }

  const flash = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingImg(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: publicUrl })
      flash('Profile photo updated!')
    } catch (err: any) {
      alert(err.message || 'Avatar upload failed')
    } finally { setUploadingImg(false) }
  }

  const handleRemoveAvatar = async () => {
    if (!profile) return
    setUploadingImg(true)
    try {
      if (profile.avatar_url) {
        try {
          const u = new URL(profile.avatar_url)
          const parts = u.pathname.split('/documents/')
          if (parts.length > 1) {
            await supabase.storage.from('documents').remove([decodeURIComponent(parts[1])])
          }
        } catch { /* ignore */ }
      }
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: null })
      flash('Profile photo removed.')
    } catch (err: any) { alert(err.message) }
    finally { setUploadingImg(false) }
  }

  // Signature upload — for managers and admins
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingSig(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', profile.id)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/manager/signature', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setProfile({ ...profile, signature_url: data.signatureUrl })
      flash('Signature uploaded! It will appear on all future endorsed documents.')
    } catch (err: any) {
      alert(err.message)
    } finally { setUploadingSig(false) }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName, birthday: birthday || null, phone, address,
      }).eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, full_name: fullName, birthday, phone, address })
      flash('Personal details saved!')
    } catch (err: any) { alert(err.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setCreateMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          username: newUsername, password: newPassword,
          full_name: newFullName, role: newRole,
          counter_name: newRole === 'counter' ? newCounterName : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCreateMsg({ type: 'ok', text: `Account for "${newFullName}" created successfully!` })
      setNewUsername(''); setNewFullName(''); setNewPassword(''); setNewCounterName('')
      // Refresh staff list
      const { data: list } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (list) setAllProfiles(list)
    } catch (err: any) {
      setCreateMsg({ type: 'err', text: err.message || 'Failed to create user' })
    } finally { setCreatingUser(false) }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading Profile...</span>
      </div>
    )
  }

  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'
  const roleBadgeColor: Record<string, string> = {
    admin: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    manager: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    counter: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    branch_staff: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold gradient-text">User Profile</h2>
          <p className="text-xs text-slate-500 mt-1">Manage your account details and credentials.</p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-700/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Avatar Card */}
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-900 to-blue-900 border-2 border-indigo-600/30 overflow-hidden flex items-center justify-center mb-4">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                : <User className="w-10 h-10 text-slate-600" />}
            </div>

            <h3 className="font-bold text-white text-sm">{profile?.full_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{profile?.email}</p>
            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadgeColor[profile?.role] || 'bg-slate-500/10 text-slate-300 border-slate-500/25'}`}>
              {profile?.role?.toUpperCase()}
            </span>

            <div className="w-full mt-4 space-y-2">
              <Button type="button" variant="outline" size="sm" disabled={uploadingImg}
                className="w-full border-[#1a2e4a] bg-[#04091a] text-slate-300 hover:bg-[#111c35] text-xs h-8 rounded-xl gap-1.5"
                onClick={() => document.getElementById('avatar-input')?.click()}>
                {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Change Photo
              </Button>
              <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {profile?.avatar_url && (
                <Button type="button" variant="outline" size="sm" disabled={uploadingImg} onClick={handleRemoveAvatar}
                  className="w-full border-rose-900/40 bg-rose-950/15 text-rose-400 hover:bg-rose-950/30 text-xs h-8 rounded-xl gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                </Button>
              )}
            </div>
          </div>

          {/* Details Form */}
          <div className="md:col-span-2 bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Personal Information</h3>
              <p className="text-xs text-slate-500 mt-0.5">Used for internal verification and system auditing.</p>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Date of Birth</Label>
                  <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl [color-scheme:dark]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Phone Number</Label>
                  <Input placeholder="e.g. 077 1234567" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Assigned Counter</Label>
                  <Input value={profile?.counter_name || 'Main Branch'} disabled
                    className="bg-[#04091a]/50 border-[#1a2e4a] text-slate-500 text-xs h-9 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Address</Label>
                <Input placeholder="e.g. Dehiattakandiya, Sri Lanka" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
              </div>
              <Button type="submit" disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs h-9 rounded-xl gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Details
              </Button>
            </form>
          </div>
        </div>

        {/* Signature Upload — Manager / Admin only */}
        {isManagerOrAdmin && (
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-indigo-400" />
                  Digital Signature
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your signature image will be embedded into all approved PDF documents.
                </p>
              </div>
              {profile?.signature_url && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                  Uploaded
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Preview */}
              <div className="w-48 h-20 rounded-xl border-2 border-dashed border-[#1a2e4a] bg-[#04091a] flex items-center justify-center overflow-hidden shrink-0">
                {profile?.signature_url
                  ? <img src={profile.signature_url} alt="Signature" className="w-full h-full object-contain p-2" />
                  : <div className="text-center">
                      <PenTool className="w-6 h-6 text-slate-700 mx-auto" />
                      <p className="text-[10px] text-slate-600 mt-1">No signature</p>
                    </div>
                }
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Upload a clear PNG or JPG of your signature on a white or transparent background.
                  Recommended size: <strong className="text-slate-300">400×150 px</strong>.
                </p>
                <div>
                  <input id="sig-input" type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                  <Button type="button" disabled={uploadingSig}
                    onClick={() => document.getElementById('sig-input')?.click()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 rounded-xl gap-2">
                    {uploadingSig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {profile?.signature_url ? 'Replace Signature' : 'Upload Signature'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin — Create Staff Account */}
        {profile?.role === 'admin' && (
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Create Staff Account
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Create login credentials for branch counter staff or managers.</p>
            </div>

            {createMsg && (
              <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                createMsg.type === 'ok'
                  ? 'bg-emerald-950/40 border border-emerald-700/40 text-emerald-300'
                  : 'bg-rose-950/40 border border-rose-700/40 text-rose-300'
              }`}>
                {createMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                {createMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Username</Label>
                  <Input placeholder="e.g. mahaoya" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Full Name</Label>
                  <Input placeholder="e.g. Nuwan Perera" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3" /> Password
                  </Label>
                  <Input type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Role</Label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-white text-xs outline-none focus:border-indigo-500/50">
                    <option value="counter">Counter Staff</option>
                    <option value="manager">Branch Manager</option>
                    <option value="branch_staff">Branch Staff</option>
                  </select>
                </div>
              </div>
              {newRole === 'counter' && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Counter Name</Label>
                  <Input placeholder="e.g. Mahaoya, Siripura, Dehiattakandiya" value={newCounterName} onChange={(e) => setNewCounterName(e.target.value)} required
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl" />
                </div>
              )}
              <Button type="submit" disabled={creatingUser}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs h-9 rounded-xl gap-1.5">
                {creatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Create Account
              </Button>
            </form>
          </div>
        )}

        {/* Admin — Staff Directory */}
        {profile?.role === 'admin' && (
          <div className="bg-[#0b1525] border border-[#1a2e4a] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1a2e4a] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Staff Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Admin-only view of all registered accounts.</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-300">
                Restricted
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a2e4a] bg-[#060c1c]">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">User</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Birthday</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0f1e33]">
                  {allProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-[#0d1a2e]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-800 to-blue-900 border border-indigo-600/30 flex items-center justify-center overflow-hidden font-bold text-indigo-300 text-[10px] shrink-0">
                            {p.avatar_url ? <img src={p.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : p.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{p.full_name}</p>
                            <p className="text-[10px] text-slate-500">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${roleBadgeColor[p.role] || 'bg-slate-500/10 text-slate-300 border-slate-500/25'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{p.birthday || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{p.phone || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-xs truncate">{p.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}