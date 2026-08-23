'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Download,
  Building2,
  FileCheck,
  Loader2,
  PenTool,
  UserPlus,
  KeyRound,
  Camera,
  Image as ImageIcon,
  Check,
  Search,
  FileSpreadsheet,
  Trash2,
  QrCode,
  Code2
} from 'lucide-react'
import { format } from 'date-fns'
import { PDFDocument } from 'pdf-lib'
import * as XLSX from 'xlsx'

interface Profile {
  id: string
  email: string
  username: string | null
  full_name: string
  role: 'manager' | 'admin' | 'branch_staff' | 'counter'
  counter_name: string | null
  signature_url: string | null
}

interface DocumentItem {
  id: string
  title: string
  file_url: string
  signed_file_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  stamp_type: string | null
  category: string
  priority: 'Normal' | 'Urgent'
  verification_code: string | null
  sender_note: string | null
  manager_note: string | null
  submitted_by_name: string
  counter_name: string
  created_at: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCounterFilter, setSelectedCounterFilter] = useState('ALL')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')

  // Upload modal state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [category, setCategory] = useState('Motor Claim')
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal')
  const [senderNote, setSenderNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Multi-page Camera capture state
  const [scannedPages, setScannedPages] = useState<{ id: string; blob: Blob; preview: string }[]>([])
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

  // Manager action modal state
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [stampType, setStampType] = useState('APPROVED')
  const [actionLoading, setActionLoading] = useState(false)

  // Signature Upload Modal State
  const [sigDialogOpen, setSigDialogOpen] = useState(false)
  const [sigFile, setSigFile] = useState<File | null>(null)
  const [sigUploading, setSigUploading] = useState(false)

  // Admin Create User Modal State
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserFullName, setNewUserFullName] = useState('')
  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<'counter' | 'branch_staff'>('counter')
  const [newUserCounter, setNewUserCounter] = useState('Mahaoya')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userSuccessMsg, setUserSuccessMsg] = useState('')
  const [userErrorMsg, setUserErrorMsg] = useState('')

  // Change Password Modal State
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const supabase = createClient()

  const isPrivileged = profile?.role === 'manager' || profile?.role === 'admin'

  useEffect(() => {
    fetchInitialData()

    const channel = supabase
      .channel('realtime_documents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        () => {
          fetchDocuments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session || !session.user) {
        router.push('/login')
        return
      }

      const user = session.user

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      } else {
        // Fallback default profile from session metadata
        setProfile({
          id: user.id,
          email: user.email || '',
          username: user.user_metadata?.username || null,
          full_name: user.user_metadata?.full_name || 'Ceylinco Officer',
          role: user.user_metadata?.role || 'counter',
          counter_name: user.user_metadata?.counter_name || 'Dehiattakandiya_Main',
          signature_url: null,
        })
      }

      await fetchDocuments()
    } catch (err) {
      console.error('Error fetching data:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && !error) {
        setDocuments(data as DocumentItem[])
      }
    } catch (e) {
      console.error('Docs error:', e)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Multi-page batch camera scanner
  const handlePageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setScannedPages((prev) => [
      ...prev,
      { id: Math.random().toString(), blob: file, preview: previewUrl },
    ])
  }

  const removeScannedPage = (id: string) => {
    setScannedPages((prev) => prev.filter((p) => p.id !== id))
  }

  const buildMultiPagePdf = async () => {
    if (scannedPages.length === 0) return
    setIsProcessingPdf(true)

    try {
      const pdfDoc = await PDFDocument.create()

      for (const pageItem of scannedPages) {
        const imageBytes = await pageItem.blob.arrayBuffer()
        let img
        if (pageItem.blob.type.includes('png')) {
          img = await pdfDoc.embedPng(imageBytes)
        } else {
          img = await pdfDoc.embedJpg(imageBytes)
        }

        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        })
      }

      const pdfBytes = await pdfDoc.save()
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength
      ) as ArrayBuffer

      const combinedBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const convertedPdf = new File(
        [combinedBlob],
        `Scanned_Doc_${scannedPages.length}_Pages_${Date.now()}.pdf`,
        { type: 'application/pdf' }
      )

      setSelectedFile(convertedPdf)
    } catch (err: any) {
      alert('Error building multi-page PDF: ' + err.message)
    } finally {
      setIsProcessingPdf(false)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !profile) return

    setUploading(true)
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`
      const filePath = `raw/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase.from('documents').insert({
        title: docTitle,
        category: category,
        priority: priority,
        file_url: publicUrl,
        sender_note: senderNote,
        submitted_by: profile.id,
        submitted_by_name: profile.full_name,
        counter_name: profile.counter_name || 'Dehiattakandiya_Main',
        status: 'pending',
      })

      if (insertError) throw insertError

      setUploadDialogOpen(false)
      setDocTitle('')
      setSenderNote('')
      setSelectedFile(null)
      setScannedPages([])
      fetchDocuments()
    } catch (err: any) {
      alert(err.message || 'File upload failed!')
    } finally {
      setUploading(false)
    }
  }

  const handleManagerDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedDoc) return
    setActionLoading(true)

    try {
      if (status === 'approved') {
        const res = await fetch('/api/documents/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: selectedDoc.id,
            managerNote: managerNote,
            stampType: stampType,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to process document')
      } else {
        const { error } = await supabase
          .from('documents')
          .update({
            status: 'rejected',
            manager_note: managerNote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDoc.id)

        if (error) throw error
      }

      setActionDialogOpen(false)
      setSelectedDoc(null)
      setManagerNote('')
      fetchDocuments()
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSignatureUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sigFile || !profile) return

    setSigUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', sigFile)
      formData.append('userId', profile.id)

      const res = await fetch('/api/manager/signature', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload signature')

      setProfile({ ...profile, signature_url: data.signatureUrl })
      setSigDialogOpen(false)
      setSigFile(null)
      alert('Digital Signature saved successfully!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSigUploading(false)
    }
  }

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setUserErrorMsg('')
    setUserSuccessMsg('')

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newUserFullName,
          username: newUserUsername,
          password: newUserPassword,
          role: newUserRole,
          counter_name: newUserRole === 'counter' ? newUserCounter : 'Dehiattakandiya_Main',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')

      setUserSuccessMsg(`User "${newUserUsername.toLowerCase()}" created successfully!`)
      setNewUserFullName('')
      setNewUserUsername('')
      setNewUserPassword('')
      setTimeout(() => {
        setCreateUserOpen(false)
        setUserSuccessMsg('')
      }, 1500)
    } catch (err: any) {
      setUserErrorMsg(err.message)
    } finally {
      setCreatingUser(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }

    setChangingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      })

      if (signInError) throw new Error('Current password is incorrect.')

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPasswordSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordDialogOpen(false)
        setPasswordSuccess('')
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const exportToExcel = () => {
    const dataToExport = filteredDocs.map((d) => ({
      Title: d.title,
      Category: d.category,
      Priority: d.priority,
      Counter: d.counter_name,
      'Submitted By': d.submitted_by_name,
      Status: d.status.toUpperCase(),
      Endorsement: d.stamp_type || 'N/A',
      'Verification Code': d.verification_code || 'N/A',
      'Submitted Date': format(new Date(d.created_at), 'yyyy-MM-dd HH:mm'),
      'Manager Note': d.manager_note || 'N/A',
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'VIP_Clearance_Log')
    XLSX.writeFile(workbook, `Ceylinco_VIP_Clearance_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Loading Ceylinco Portal...</span>
      </div>
    )
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.submitted_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.verification_code && doc.verification_code.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCounter =
      selectedCounterFilter === 'ALL' || doc.counter_name === selectedCounterFilter

    const matchesCategory =
      selectedCategoryFilter === 'ALL' || doc.category === selectedCategoryFilter

    return matchesSearch && matchesCounter && matchesCategory
  })

  const pendingDocs = filteredDocs.filter((d) => d.status === 'pending')
  const approvedDocs = filteredDocs.filter((d) => d.status === 'approved')
  const rejectedDocs = filteredDocs.filter((d) => d.status === 'rejected')

  const getRoleLabel = () => {
    if (profile?.role === 'manager') return 'Branch Manager'
    if (profile?.role === 'admin') return 'System Administrator'
    if (profile?.role === 'counter') return `${profile.counter_name} VIP Counter`
    return 'Branch Staff'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                Ceylinco VIP Approval Network
              </h1>
              <p className="text-xs text-slate-400">Dehiattakandiya Branch</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-white">{profile?.full_name}</div>
              <div className="text-xs text-blue-400 font-medium">{getRoleLabel()}</div>
            </div>

            {isPrivileged && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSigDialogOpen(true)}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1" />
                Signature
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPasswordDialogOpen(true)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1" />
              Password
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="bg-slate-900 border-slate-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Pending Authorization</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{pendingDocs.length}</div>
              <p className="text-xs text-slate-400 mt-1">Live synchronizing across counters</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Processed & Endorsed</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-400">{approvedDocs.length}</div>
              <p className="text-xs text-slate-400 mt-1">Certified with QR Verification</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Rejected Requests</CardTitle>
              <XCircle className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-rose-400">{rejectedDocs.length}</div>
              <p className="text-xs text-slate-400 mt-1">Returned for revisions</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Document Clearance Queue</h2>
              <p className="text-sm text-slate-400">
                Authorized digital gateway for Mahaoya, Siripura & Aralaganwila VIP counters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={exportToExcel}
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Export Excel Log
              </Button>

              {isPrivileged && (
                <Button
                  onClick={() => setCreateUserOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Add Counter User
                </Button>
              )}

              {!isPrivileged && (
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-9 shadow"
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                  Submit Document
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <Input
                placeholder="Search Title, Policy No, Officer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white pl-9 text-xs h-9"
              />
            </div>

            <div>
              <select
                value={selectedCounterFilter}
                onChange={(e) => setSelectedCounterFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="ALL">All Counters & Branches</option>
                <option value="Mahaoya">Mahaoya VIP Counter</option>
                <option value="Siripura">Siripura VIP Counter</option>
                <option value="Aralaganwila">Aralaganwila VIP Counter</option>
                <option value="Dehiattakandiya_Main">Dehiattakandiya Main</option>
              </select>
            </div>

            <div>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="Motor Claim">Motor Claim</option>
                <option value="Policy Endorsement">Policy Endorsement</option>
                <option value="Life Proposal">Life Proposal</option>
                <option value="Policy Cancellation">Policy Cancellation</option>
                <option value="Underwriting Approval">Underwriting Approval</option>
                <option value="General Request">General Request</option>
              </select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 p-1">
            <TabsTrigger value="all">All Documents ({filteredDocs.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger>
            <TabsTrigger value="approved">Processed ({approvedDocs.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedDocs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <DocumentTable
              docs={filteredDocs}
              profile={profile}
              onActionClick={(doc) => {
                setSelectedDoc(doc)
                setActionDialogOpen(true)
              }}
            />
          </TabsContent>
          <TabsContent value="pending" className="space-y-4">
            <DocumentTable
              docs={pendingDocs}
              profile={profile}
              onActionClick={(doc) => {
                setSelectedDoc(doc)
                setActionDialogOpen(true)
              }}
            />
          </TabsContent>
          <TabsContent value="approved" className="space-y-4">
            <DocumentTable
              docs={approvedDocs}
              profile={profile}
              onActionClick={(doc) => {
                setSelectedDoc(doc)
                setActionDialogOpen(true)
              }}
            />
          </TabsContent>
          <TabsContent value="rejected" className="space-y-4">
            <DocumentTable
              docs={rejectedDocs}
              profile={profile}
              onActionClick={(doc) => {
                setSelectedDoc(doc)
                setActionDialogOpen(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 space-y-1">
        <div className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
          <Code2 className="w-4 h-4 text-blue-500" />
          <span>Designed & Developed by <strong className="text-blue-400 font-semibold">Ceylon Digi Solutions</strong></span>
        </div>
        <p className="text-[11px] text-slate-500">
          System Architecture & Engineering by <strong className="text-slate-300">Kavindu Dilhara</strong> (Founder, Ceylon Digi Solutions) • All Rights Reserved
        </p>
      </footer>

      {/* Upload Document Modal with Multi-Page Scanner */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Submit Document for Signature</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Upload existing PDF or capture multiple pages using Camera.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadDocument} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Document Title / Policy Number</Label>
              <Input
                placeholder="e.g., VIP Claim #8921 Endorsement"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Document Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="Motor Claim">Motor Claim</option>
                  <option value="Policy Endorsement">Policy Endorsement</option>
                  <option value="Life Proposal">Life Proposal</option>
                  <option value="Policy Cancellation">Policy Cancellation</option>
                  <option value="Underwriting Approval">Underwriting Approval</option>
                  <option value="General Request">General Request</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-9 px-3 rounded bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent Priority 🔥</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Sender Note (Optional)</Label>
              <Input
                placeholder="e.g., Customer requested urgent same-day clearance"
                value={senderNote}
                onChange={(e) => setSenderNote(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>

            <div className="space-y-2 border-t border-slate-800 pt-3">
              <Label className="text-slate-200 text-xs">Attach Document</Label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs flex items-center justify-center gap-1.5 h-10"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  Take Page Photo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs flex items-center justify-center gap-1.5 h-10"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Browse Single PDF
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePageCapture}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null)
                  setScannedPages([])
                }}
              />

              {scannedPages.length > 0 && (
                <div className="space-y-2 p-3 bg-slate-950 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Captured Pages ({scannedPages.length})</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={buildMultiPagePdf}
                      disabled={isProcessingPdf}
                      className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                    >
                      {isProcessingPdf ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Compile into 1 PDF
                    </Button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {scannedPages.map((page, idx) => (
                      <div key={page.id} className="relative w-16 h-20 bg-slate-900 rounded border border-slate-700 shrink-0 overflow-hidden group">
                        <img src={page.preview} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 left-0 bg-black/70 text-[9px] text-white px-1">P.{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeScannedPage(page.id)}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="p-2.5 rounded bg-blue-950/40 border border-blue-800 text-xs text-blue-300 flex items-center justify-between mt-2">
                  <span className="truncate">Attached: {selectedFile.name}</span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">PDF Ready</Badge>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !selectedFile} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                Upload & Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager Review Modal */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Document Endorsement & Processing</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              {selectedDoc?.title} ({selectedDoc?.counter_name} Counter)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">
                <span className="font-semibold text-slate-300">Submitted By:</span> {selectedDoc?.submitted_by_name}
              </p>
              <p className="text-slate-400">
                <span className="font-semibold text-slate-300">Category:</span> {selectedDoc?.category} |{' '}
                <span className="font-semibold text-slate-300">Priority:</span>{' '}
                <span className={selectedDoc?.priority === 'Urgent' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {selectedDoc?.priority}
                </span>
              </p>
              {selectedDoc?.sender_note && (
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Counter Note:</span> {selectedDoc.sender_note}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={selectedDoc?.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-blue-400 hover:underline"
              >
                <FileText className="w-3.5 h-3.5 mr-1" /> View Original Document (PDF)
              </a>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Endorsement Stamp Type</Label>
              <select
                value={stampType}
                onChange={(e) => setStampType(e.target.value)}
                className="w-full h-9 px-3 rounded bg-slate-950 border border-slate-700 text-white text-xs"
              >
                <option value="APPROVED">APPROVED & AUTHORIZED</option>
                <option value="RECOMMENDED">RECOMMENDED</option>
                <option value="VERIFIED">VERIFIED & CERTIFIED</option>
                <option value="SIGN_ONLY">SIGNATURE & OFFICIAL SEAL ONLY</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="mgrNote" className="text-slate-200 text-xs">Manager Remarks / Note</Label>
              <Input
                id="mgrNote"
                placeholder="e.g., Verified as per guidelines"
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={actionLoading}
              onClick={() => handleManagerDecision('rejected')}
              className="border-rose-800 text-rose-400 hover:bg-rose-950 text-xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject
            </Button>
            <Button
              type="button"
              disabled={actionLoading}
              onClick={() => handleManagerDecision('approved')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PenTool className="w-3.5 h-3.5 mr-1.5" />}
              Apply Stamp & Sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Modal */}
      <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Manager Digital Signature</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Upload transparent PNG/JPG to auto-stamp on certified documents.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignatureUpload} className="space-y-4 mt-2">
            {profile?.signature_url && (
              <div className="p-3 bg-slate-950 rounded border border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-2">Current Active Signature:</p>
                <img
                  src={profile.signature_url}
                  alt="Manager Signature"
                  className="h-16 mx-auto bg-white/90 p-1 rounded"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Select Signature Image</Label>
              <Input
                type="file"
                accept="image/png, image/jpeg"
                onChange={(e) => setSigFile(e.target.files?.[0] || null)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSigDialogOpen(false)}
                className="border-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={sigUploading} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                {sigUploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                Save Signature
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin User Creator Modal */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Create Counter / Staff Account</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Create an account with simple Username & Default Password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNewUser} className="space-y-3 mt-2">
            {userErrorMsg && <div className="p-2 text-xs rounded bg-red-950 border border-red-800 text-red-400">{userErrorMsg}</div>}
            {userSuccessMsg && <div className="p-2 text-xs rounded bg-emerald-950 border border-emerald-800 text-emerald-400">{userSuccessMsg}</div>}
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Officer / Display Name</Label>
              <Input
                placeholder="e.g. Mahaoya Counter Officer"
                value={newUserFullName}
                onChange={(e) => setNewUserFullName(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Login Username</Label>
              <Input
                placeholder="e.g. mahaoya / siripura / aralaganwila"
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white font-mono text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Account Role</Label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-xs"
              >
                <option value="counter">VIP Counter Officer</option>
                <option value="branch_staff">Branch Staff</option>
              </select>
            </div>
            {newUserRole === 'counter' && (
              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Assign VIP Counter</Label>
                <select
                  value={newUserCounter}
                  onChange={(e) => setNewUserCounter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-slate-950 border border-slate-700 text-white text-xs"
                >
                  <option value="Mahaoya">Mahaoya VIP Counter</option>
                  <option value="Siripura">Siripura VIP Counter</option>
                  <option value="Aralaganwila">Aralaganwila VIP Counter</option>
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Default Password</Label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateUserOpen(false)} className="border-slate-700 text-slate-300 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={creatingUser} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                {creatingUser ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Change Your Password</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">Update your portal password securely.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-3 mt-2">
            {passwordError && <div className="p-2 text-xs rounded bg-red-950 border border-red-800 text-red-400">{passwordError}</div>}
            {passwordSuccess && <div className="p-2 text-xs rounded bg-emerald-950 border border-emerald-800 text-emerald-400">{passwordSuccess}</div>}
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Current Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-200 text-xs">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-9"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} className="border-slate-700 text-slate-300 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={changingPassword} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                {changingPassword ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1.5" />}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DocumentTable({
  docs,
  profile,
  onActionClick,
}: {
  docs: DocumentItem[]
  profile: Profile | null
  onActionClick: (doc: DocumentItem) => void
}) {
  const isPrivileged = profile?.role === 'manager' || profile?.role === 'admin'

  if (docs.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 text-center py-12">
        <CardContent>
          <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium text-sm">No documents matching your search or queue.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 shadow">
      <Table>
        <TableHeader className="bg-slate-950/70">
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-300 font-semibold text-xs">Document Title</TableHead>
            <TableHead className="text-slate-300 font-semibold text-xs">Category & Priority</TableHead>
            <TableHead className="text-slate-300 font-semibold text-xs">Counter</TableHead>
            <TableHead className="text-slate-300 font-semibold text-xs">Officer / Date</TableHead>
            <TableHead className="text-slate-300 font-semibold text-xs">Status</TableHead>
            <TableHead className="text-slate-300 font-semibold text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-800/40 transition">
              <TableCell className="font-medium text-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold">{doc.title}</span>
                </div>
                {doc.verification_code && (
                  <p className="text-[11px] text-blue-400/80 font-mono mt-0.5 pl-6">
                    Code: {doc.verification_code}
                  </p>
                )}
                {doc.sender_note && (
                  <p className="text-[11px] text-slate-400 mt-0.5 pl-6">Note: {doc.sender_note}</p>
                )}
                {doc.manager_note && (
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5 pl-6">
                    Manager: {doc.manager_note}
                  </p>
                )}
              </TableCell>

              <TableCell>
                <div className="space-y-1">
                  <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 text-[10px]">
                    {doc.category || 'General'}
                  </Badge>
                  {doc.priority === 'Urgent' && (
                    <div>
                      <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                        🔥 Urgent
                      </Badge>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 text-xs">
                  {doc.counter_name}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="text-xs text-slate-300">{doc.submitted_by_name}</div>
                <div className="text-[11px] text-slate-500">{format(new Date(doc.created_at), 'dd MMM, hh:mm a')}</div>
              </TableCell>

              <TableCell>
                {doc.status === 'pending' && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
                    Pending Sign
                  </Badge>
                )}
                {doc.status === 'approved' && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                    {doc.stamp_type === 'RECOMMENDED'
                      ? 'Recommended'
                      : doc.stamp_type === 'VERIFIED'
                      ? 'Verified & Certified'
                      : doc.stamp_type === 'SIGN_ONLY'
                      ? 'Endorsed & Signed'
                      : 'Approved & Signed'}
                  </Badge>
                )}
                {doc.status === 'rejected' && (
                  <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs">
                    Rejected
                  </Badge>
                )}
              </TableCell>

              <TableCell className="text-right space-x-2">
                {isPrivileged && doc.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => onActionClick(doc)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                  >
                    <PenTool className="w-3 h-3 mr-1" />
                    Review & Process
                  </Button>
                )}

                {doc.status === 'approved' && (
                  <div className="inline-flex items-center gap-1.5">
                    <a
                      href={`/verify?code=${doc.verification_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-2 py-1 text-xs rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                      title="View Online Verification"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={doc.signed_file_url || doc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </a>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}