'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
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
  Download,
  FileCheck,
  Loader2,
  PenTool,
  Camera,
  Search,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { PDFDocument } from 'pdf-lib'

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
  submitted_by: string
  submitted_by_name: string
  counter_name: string
  created_at: string
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [category, setCategory] = useState('Motor Claim')
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal')
  const [senderNote, setSenderNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scannedPages, setScannedPages] = useState<{ id: string; blob: Blob; preview: string }[]>([])
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

  // Manager action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [stampType, setStampType] = useState('APPROVED')
  const [actionLoading, setActionLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'my-pending'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      loadUserData(session.user)
    })

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          loadUserData(session.user)
        } else if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    fetchDocuments()

    const channel = supabase
      .channel('realtime_docs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        fetchDocuments
      )
      .subscribe()

    return () => {
      authListener?.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  const loadUserData = async (user: any) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileData) {
      setProfile(profileData as Profile)
    }
    setLoading(false)
  }

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setDocuments(data as DocumentItem[])
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
        const img = pageItem.blob.type.includes('png')
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes)
        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
      }

      const pdfBytes = await pdfDoc.save()
      const combinedBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      setSelectedFile(
        new File([combinedBlob], `Scanned_Doc_${Date.now()}.pdf`, { type: 'application/pdf' })
      )
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: 'PDF Compile Error: ' + err.message })
    } finally {
      setIsProcessingPdf(false)
    }
  }

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !profile) return
    setUploading(true)
    try {
      const filePath = `raw/${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`
      await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { contentType: 'application/pdf' })

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      await supabase.from('documents').insert({
        title: docTitle,
        category,
        priority,
        file_url: publicUrl,
        sender_note: senderNote,
        submitted_by: profile.id,
        submitted_by_name: profile.full_name,
        counter_name: profile.counter_name || 'Dehiattakandiya_Main',
        status: 'pending',
      })

      setUploadDialogOpen(false)
      setDocTitle('')
      setSenderNote('')
      setSelectedFile(null)
      setScannedPages([])
      setBannerMsg({ type: 'success', text: 'Document submitted successfully for manager approval!' })
      fetchDocuments()
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Upload failed' })
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
            managerNote,
            stampType,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to endorse document')
      } else {
        await supabase
          .from('documents')
          .update({
            status: 'rejected',
            manager_note: managerNote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedDoc.id)
      }

      setActionDialogOpen(false)
      setSelectedDoc(null)
      setManagerNote('')
      setBannerMsg({ type: 'success', text: `Document ${status} successfully!` })
      fetchDocuments()
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Action failed' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" />
        <span>Loading Clearance System...</span>
      </div>
    )
  }

  // Filtering documents based on sidebar view param
  const filteredSearchDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.submitted_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.verification_code && doc.verification_code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const myDocs = filteredSearchDocs.filter((d) => d.submitted_by === profile?.id)

  let displayedDocs: DocumentItem[] = []
  let viewTitle = 'My Pending Submissions'

  if (currentView === 'branch-pending') {
    displayedDocs = filteredSearchDocs.filter((d) => d.status === 'pending')
    viewTitle = 'Branch Pending Queue'
  } else if (currentView === 'branch-approved') {
    displayedDocs = filteredSearchDocs.filter((d) => d.status === 'approved')
    viewTitle = 'All Branch Approved Documents'
  } else if (currentView === 'branch-rejected') {
    displayedDocs = filteredSearchDocs.filter((d) => d.status === 'rejected')
    viewTitle = 'All Branch Rejected Documents'
  } else if (currentView === 'branch-all') {
    displayedDocs = filteredSearchDocs
    viewTitle = 'All Branch Submitted Documents'
  } else if (currentView === 'my-approved') {
    displayedDocs = myDocs.filter((d) => d.status === 'approved')
    viewTitle = 'My Approved Submissions'
  } else if (currentView === 'my-rejected') {
    displayedDocs = myDocs.filter((d) => d.status === 'rejected')
    viewTitle = 'My Rejected Submissions'
  } else if (currentView === 'my-all') {
    displayedDocs = myDocs
    viewTitle = 'All My Submissions'
  } else {
    displayedDocs = myDocs.filter((d) => d.status === 'pending')
    viewTitle = 'My Pending Submissions'
  }

  const myPendingCount = myDocs.filter((d) => d.status === 'pending').length
  const myApprovedCount = myDocs.filter((d) => d.status === 'approved').length
  const myRejectedCount = myDocs.filter((d) => d.status === 'rejected').length

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="space-y-6">
        {/* Banner Alert (In-App Toast) */}
        {bannerMsg && (
          <div className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            bannerMsg.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {bannerMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{bannerMsg.text}</span>
            </div>
            <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{viewTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Managing document clearance for <strong className="text-slate-200">{profile?.counter_name || 'Main Branch'}</strong>
            </p>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-md text-xs h-9"
          >
            <UploadCloud className="w-4 h-4 mr-1.5" /> Submit Document
          </Button>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">My Pending</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{myPendingCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">My Approved</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{myApprovedCount}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">My Rejected</CardTitle>
              <XCircle className="w-4 h-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{myRejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <Input
            placeholder="Search documents by title, policy no, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border-slate-800 text-white pl-9 text-xs h-9"
          />
        </div>

        {/* Document Table */}
        <DocumentTable
          docs={displayedDocs}
          profile={profile}
          onActionClick={(doc) => {
            setSelectedDoc(doc)
            setActionDialogOpen(true)
          }}
        />
      </div>

      {/* Upload Modal */}
      {uploadDialogOpen && (
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-base">Submit Document for Signature</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadDocument} className="space-y-4 mt-1">
              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Document Title / Policy Number</Label>
                <Input
                  placeholder="e.g. VIP Claim #8921 Endorsement"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-200 text-xs">Category</Label>
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
                  placeholder="e.g. Customer requested immediate endorsement"
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
                    className="bg-slate-950 text-white border-slate-700 text-xs h-9 flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Take Page Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-950 text-white border-slate-700 text-xs h-9 flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Browse PDF
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
                        {isProcessingPdf ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Compile to PDF'}
                      </Button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {scannedPages.map((page, idx) => (
                        <div
                          key={page.id}
                          className="relative w-14 h-18 bg-slate-900 rounded border border-slate-700 shrink-0 overflow-hidden"
                        >
                          <img src={page.preview} alt={`P.${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeScannedPage(page.id)}
                            className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded p-0.5 text-[9px]"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="p-2 rounded bg-blue-950/40 border border-blue-800 text-xs text-blue-300 flex items-center justify-between">
                    <span className="truncate">{selectedFile.name}</span>
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
                <Button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-1.5" />}
                  Submit Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Manager Decision Modal */}
      {actionDialogOpen && (
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white text-base">Document Endorsement & Processing</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 my-2 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Title:</span> {selectedDoc?.title}
                </p>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-300">Counter:</span> {selectedDoc?.counter_name} |{' '}
                  <span className="font-semibold text-slate-300">Officer:</span> {selectedDoc?.submitted_by_name}
                </p>
                {selectedDoc?.sender_note && (
                  <p className="text-slate-400">
                    <span className="font-semibold text-slate-300">Note:</span> {selectedDoc.sender_note}
                  </p>
                )}
              </div>

              <a
                href={selectedDoc?.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> View Uploaded Original PDF
              </a>

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
                  <option value="SIGN_ONLY">SIGNATURE & SEAL ONLY</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-200 text-xs">Manager Remarks / Notes</Label>
                <Input
                  placeholder="e.g. Endorsed and processed"
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading}
                onClick={() => handleManagerDecision('rejected')}
                className="text-rose-400 border-rose-800 hover:bg-rose-950 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              <Button
                type="button"
                disabled={actionLoading}
                onClick={() => handleManagerDecision('approved')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <PenTool className="w-3.5 h-3.5 mr-1" />}
                Apply Stamp & Sign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
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
          <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400 text-xs">No documents found in this queue.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 shadow">
      <Table>
        <TableHeader className="bg-slate-950/70">
          <TableRow className="border-slate-800">
            <TableHead className="text-slate-300 text-xs">Document Title / Code</TableHead>
            <TableHead className="text-slate-300 text-xs">Category & Priority</TableHead>
            <TableHead className="text-slate-300 text-xs">Counter / Submitter</TableHead>
            <TableHead className="text-slate-300 text-xs">Status</TableHead>
            <TableHead className="text-slate-300 text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-800/40 text-xs">
              <TableCell className="font-medium text-slate-100">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">{doc.title}</span>
                </div>
                {doc.verification_code && (
                  <p className="text-[10px] font-mono text-blue-400 pl-6 mt-0.5">
                    {doc.verification_code}
                  </p>
                )}
                {doc.manager_note && (
                  <p className="text-[10px] text-emerald-400 pl-6 mt-0.5">
                    Manager: {doc.manager_note}
                  </p>
                )}
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 text-[10px]">
                  {doc.category}
                </Badge>
                {doc.priority === 'Urgent' && (
                  <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-[10px] ml-1.5">
                    🔥 Urgent
                  </Badge>
                )}
              </TableCell>

              <TableCell>
                <div className="text-slate-300 font-medium">{doc.counter_name}</div>
                <div className="text-[10px] text-slate-500">{doc.submitted_by_name} • {format(new Date(doc.created_at), 'dd MMM, hh:mm a')}</div>
              </TableCell>

              <TableCell>
                {doc.status === 'pending' && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                    Pending Sign
                  </Badge>
                )}
                {doc.status === 'approved' && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    {doc.stamp_type || 'Approved'}
                  </Badge>
                )}
                {doc.status === 'rejected' && (
                  <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
                    Rejected
                  </Badge>
                )}
              </TableCell>

              <TableCell className="text-right space-x-1.5">
                {isPrivileged && doc.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => onActionClick(doc)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] h-7"
                  >
                    <PenTool className="w-3 h-3 mr-1" /> Process
                  </Button>
                )}

                {doc.status === 'approved' && (
                  <div className="inline-flex items-center gap-1">
                    <a
                      href={`/verify?code=${doc.verification_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center p-1.5 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                      title="Verify"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={doc.signed_file_url!}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex items-center px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
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