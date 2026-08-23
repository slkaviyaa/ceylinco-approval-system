'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { User, Shield, Camera, Loader2, Save, Users, Calendar, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [allProfiles, setAllProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [msg, setMsg] = useState('')

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: pData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (pData) {
      setProfile(pData)
      setFullName(pData.full_name || '')
      setBirthday(pData.birthday || '')
      setPhone(pData.phone || '')
      setAddress(pData.address || '')

      // If System Admin, fetch ALL user personal records
      if (pData.role === 'admin') {
        const { data: list } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
        if (list) setAllProfiles(list)
      }
    }
    setLoading(false)
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
      setMsg('Profile photo updated successfully!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Avatar upload failed')
    } finally {
      setUploadingImg(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    try {
      const { error } = await supabase.from('profiles').update({
        full_name: fullName,
        birthday: birthday || null,
        phone: phone,
        address: address,
      }).eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, full_name: fullName, birthday, phone, address })
      setMsg('Personal details saved successfully!')
      setTimeout(() => setMsg(''), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to save')
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
        <span>Loading Profile...</span>
      </div>
    )
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Profile & Credentials</h2>
          <p className="text-sm text-slate-400">Manage your personal identification details and account security.</p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar Card */}
          <Card className="bg-slate-900 border-slate-800 text-center p-6 flex flex-col items-center justify-center">
            <div className="relative w-28 h-28 rounded-full bg-slate-950 border-2 border-blue-600/40 p-1 flex items-center justify-center overflow-hidden mb-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-14 h-14 text-slate-600" />
              )}
            </div>

            <label className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImg}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                {uploadingImg ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Camera className="w-3.5 h-3.5 mr-1.5" />}
                Change Photo
              </Button>
            </label>
            <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

            <div className="mt-4 space-y-1">
              <h3 className="font-semibold text-white text-sm">{profile?.full_name}</h3>
              <p className="text-xs text-slate-400">{profile?.email}</p>
              <Badge className="bg-blue-600/20 text-blue-400 border border-blue-600/30 text-[10px] mt-1">
                {profile?.role?.toUpperCase()}
              </Badge>
            </div>
          </Card>

          {/* Details Form */}
          <Card className="bg-slate-900 border-slate-800 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-white">Personal Information</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Information used for internal verification and system auditing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Full Name</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Date of Birth</Label>
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Contact Phone Number</Label>
                    <Input
                      placeholder="e.g. 077 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-300 text-xs">Assigned Unit / Counter</Label>
                    <Input
                      value={profile?.counter_name || 'Main Branch'}
                      disabled
                      className="bg-slate-950/60 border-slate-800 text-slate-400 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-300 text-xs">Official / Residential Address</Label>
                  <Input
                    placeholder="e.g. Dehiattakandiya, Sri Lanka"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                  />
                </div>

                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9">
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* STRICT ADMIN-ONLY VIEW: Other User Records */}
        {profile?.role === 'admin' && (
          <Card className="bg-slate-900 border-slate-800 mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Confidential Staff Directory (Admin Only)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Private view for System Administrator. Branch Managers cannot access this view.
                </CardDescription>
              </div>
              <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-xs">Restricted</Badge>
            </CardHeader>
            <CardContent>
              <div className="border border-slate-800 rounded-md overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-300 text-xs">User</TableHead>
                      <TableHead className="text-slate-300 text-xs">Role / Unit</TableHead>
                      <TableHead className="text-slate-300 text-xs">Birthday</TableHead>
                      <TableHead className="text-slate-300 text-xs">Phone</TableHead>
                      <TableHead className="text-slate-300 text-xs">Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProfiles.map((p) => (
                      <TableRow key={p.id} className="border-slate-800 text-xs">
                        <TableCell className="font-medium text-white">
                          <div>{p.full_name}</div>
                          <div className="text-[10px] text-slate-400">{p.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 text-[10px]">
                            {p.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{p.birthday || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">{p.phone || 'N/A'}</TableCell>
                        <TableCell className="text-slate-400 truncate max-w-xs">{p.address || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  )
}