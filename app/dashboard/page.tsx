'use client'

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SidebarLayout from '@/components/SidebarLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText, UploadCloud, Download, FileCheck, Loader2, PenTool,
  Camera, Search, QrCode, Clock, CheckCircle2, XCircle, AlertCircle,
  Move, Trash2, TrendingUp, Plus
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
    <Suspense fallback={
      <div className="min-h-screen bg-[#04091a] flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading Dashboard...</span>
      </div>
    }>
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

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [category, setCategory] = useState('Motor Claim')
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal')
  const [senderNote, setSenderNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scannedPages, setScannedPages] = useState<{ id: string; blob: Blob; preview: string }[]>([])
  const [isProcessingPdf, setIsProcessingPdf] = useState(false)

  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [managerNote, setManagerNote] = useState('')
  const [stampType, setStampType] = useState('APPROVED')
  const [actionLoading, setActionLoading] = useState(false)

  const [stampPos, setStampPos] = useState({ x: 70, y: 75 })
  const [isDragging, setIsDragging] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'my-pending'

  const fetchDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setDocuments(data as DocumentItem[])
  }, [supabase])

  const loadUserData = useCallback(async (user: any) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (profileData) setProfile(profileData as Profile)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      loadUserData(session.user)
    })
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) loadUserData(session.user)
        else if (event === 'SIGNED_OUT') router.push('/login')
      }
    )
    fetchDocuments()
    const channel = supabase.channel('realtime_docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => fetchDocuments())
      .subscribe()
    return () => { authListener?.unsubscribe(); supabase.removeChannel(channel) }
  }, [supabase, router, loadUserData, fetchDocuments])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Process captured photo through Canvas API → grayscale + contrast = scan look
  const processImageAsScan = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        // Apply document scan filter: grayscale + enhanced contrast + slight brightness
        ctx.filter = 'grayscale(100%) contrast(1.6) brightness(1.08)'
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to process image'))
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = url
    })
  }

  // Auto-compile pages list → PDF blob
  const compilePagesToPdf = async (pages: { blob: Blob }[]): Promise<File> => {
    const pdfDoc = await PDFDocument.create()
    for (const pageItem of pages) {
      const imageBytes = await pageItem.blob.arrayBuffer()
      const img = pageItem.blob.type.includes('png')
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes)
      const page = pdfDoc.addPage([img.width, img.height])
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    }
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    return new File([blob], `Scanned_Doc_${Date.now()}.pdf`, { type: 'application/pdf' })
  }

  const handlePageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-captured
    e.target.value = ''
    setIsProcessingPdf(true)
    try {
      const scannedBlob = await processImageAsScan(file)
      const previewUrl = URL.createObjectURL(scannedBlob)
      const newPage = { id: Math.random().toString(), blob: scannedBlob, preview: previewUrl }
      const updatedPages = [...scannedPages, newPage]
      setScannedPages(updatedPages)
      // Auto-compile to PDF immediately — no manual "Compile" step needed
      const pdfFile = await compilePagesToPdf(updatedPages)
      setSelectedFile(pdfFile)
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: 'Scan error: ' + err.message })
    } finally {
      setIsProcessingPdf(false)
    }
  }

  const removeScannedPage = async (id: string) => {
    const updatedPages = scannedPages.filter((p) => p.id !== id)
    setScannedPages(updatedPages)
    if (updatedPages.length === 0) {
      setSelectedFile(null)
    } else {
      try {
        const pdfFile = await compilePagesToPdf(updatedPages)
        setSelectedFile(pdfFile)
      } catch { /* ignore */ }
    }
  }

  const buildMultiPagePdf = async () => {
    if (scannedPages.length === 0) return
    setIsProcessingPdf(true)
    try {
      const pdfFile = await compilePagesToPdf(scannedPages)
      setSelectedFile(pdfFile)
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
      await supabase.storage.from('documents').upload(filePath, selectedFile, { contentType: 'application/pdf' })
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)
      await supabase.from('documents').insert({
        title: docTitle, category, priority, file_url: publicUrl, sender_note: senderNote,
        submitted_by: profile.id, submitted_by_name: profile.full_name,
        counter_name: profile.counter_name || 'Main', status: 'pending'
      })
      setUploadDialogOpen(false); setDocTitle(''); setSenderNote(''); setSelectedFile(null); setScannedPages([])
      setBannerMsg({ type: 'success', text: 'Document submitted successfully!' })
      fetchDocuments()
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100))
    setStampPos({ x, y })
  }

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !canvasRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((touch.clientY - rect.top) / rect.height) * 100))
    setStampPos({ x, y })
  }

  const handleManagerDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedDoc) return
    setActionLoading(true)
    try {
      if (status === 'approved') {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/documents/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ documentId: selectedDoc.id, managerNote, stampType, customCoordinates: stampPos }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to endorse document')
      } else {
        await supabase.from('documents').update({
          status: 'rejected', manager_note: managerNote, updated_at: new Date().toISOString()
        }).eq('id', selectedDoc.id)
      }
      setActionDialogOpen(false); setSelectedDoc(null); setManagerNote('')
      setBannerMsg({ type: 'success', text: `Document ${status} successfully!` })
      fetchDocuments()
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Action failed' })
    } finally {
      setActionLoading(false)
    }
  }

  // FIX: Delete document + clean up Supabase Storage files
  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!confirm('Permanently delete this document record and its files?')) return
    try {
      // Extract storage paths from public URLs and delete
      const extractPath = (url: string) => {
        try {
          const u = new URL(url)
          const parts = u.pathname.split('/documents/')
          return parts.length > 1 ? decodeURIComponent(parts[1]) : null
        } catch { return null }
      }
      const paths: string[] = []
      if (doc.file_url) { const p = extractPath(doc.file_url); if (p) paths.push(p) }
      if (doc.signed_file_url) { const p = extractPath(doc.signed_file_url); if (p) paths.push(p) }
      if (paths.length > 0) {
        await supabase.storage.from('documents').remove(paths)
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)
      if (error) throw error
      setBannerMsg({ type: 'success', text: 'Document and files deleted successfully!' })
      fetchDocuments()
    } catch (err: any) {
      setBannerMsg({ type: 'error', text: err.message || 'Delete error' })
    }
  }

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(q) ||
      doc.submitted_by_name.toLowerCase().includes(q) ||
      (doc.verification_code && doc.verification_code.toLowerCase().includes(q))
    )
  }, [documents, searchQuery])

  const myDocs = useMemo(() => filteredDocs.filter((d) => d.submitted_by === profile?.id), [filteredDocs, profile?.id])

  const { displayedDocs, viewTitle } = useMemo(() => {
    if (currentView === 'branch-pending') return { displayedDocs: filteredDocs.filter((d) => d.status === 'pending'), viewTitle: 'Branch Pending Queue' }
    if (currentView === 'branch-approved') return { displayedDocs: filteredDocs.filter((d) => d.status === 'approved'), viewTitle: 'All Branch Approved' }
    if (currentView === 'branch-rejected') return { displayedDocs: filteredDocs.filter((d) => d.status === 'rejected'), viewTitle: 'All Branch Rejected' }
    if (currentView === 'branch-all') return { displayedDocs: filteredDocs, viewTitle: 'All Branch Documents' }
    if (currentView === 'my-approved') return { displayedDocs: myDocs.filter((d) => d.status === 'approved'), viewTitle: 'My Approved Submissions' }
    if (currentView === 'my-rejected') return { displayedDocs: myDocs.filter((d) => d.status === 'rejected'), viewTitle: 'My Rejected Submissions' }
    if (currentView === 'my-all') return { displayedDocs: myDocs, viewTitle: 'All My Submissions' }
    return { displayedDocs: myDocs.filter((d) => d.status === 'pending'), viewTitle: 'My Pending Submissions' }
  }, [currentView, filteredDocs, myDocs])

  const myPending = useMemo(() => myDocs.filter((d) => d.status === 'pending').length, [myDocs])
  const myApproved = useMemo(() => myDocs.filter((d) => d.status === 'approved').length, [myDocs])
  const myRejected = useMemo(() => myDocs.filter((d) => d.status === 'rejected').length, [myDocs])

  // FIX: Use role only, no hardcoded username check
  const isManagerOrAdmin = profile?.role === 'manager' || profile?.role === 'admin'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#04091a] gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Loading Clearance System...</span>
      </div>
    )
  }

  return (
    <SidebarLayout profile={profile} onSignOut={handleSignOut}>
      <div className="space-y-6">

        {/* Banner */}
        {bannerMsg && (
          <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-700/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {bannerMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{bannerMsg.text}</span>
            </div>
            <button onClick={() => setBannerMsg(null)} className="text-slate-500 hover:text-white px-1.5">✕</button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">{viewTitle}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {profile?.counter_name || 'Main Branch'} · {profile?.full_name}
            </p>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-xs h-9 gap-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Submit Document
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'My Pending', value: myPending, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/10 to-transparent', border: 'border-amber-500/20', glow: 'glow-amber' },
            { label: 'My Approved', value: myApproved, icon: CheckCircle2, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/20', glow: 'glow-emerald' },
            { label: 'My Rejected', value: myRejected, icon: XCircle, color: 'text-rose-400', bg: 'from-rose-500/10 to-transparent', border: 'border-rose-500/20', glow: 'glow-rose' },
          ].map(({ label, value, icon: Icon, color, bg, border, glow }) => (
            <div key={label} className={`relative overflow-hidden p-4 rounded-2xl bg-[#0b1525] border ${border} ${glow}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
              <div className="relative flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-slate-500">{label}</p>
                <div className={`w-7 h-7 rounded-lg bg-[#111c35] flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
              </div>
              <div className={`relative text-3xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by title, name or verification code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0b1525] border-[#1a2e4a] text-white pl-9 text-xs h-9 rounded-xl focus:border-indigo-500/50 placeholder:text-slate-600"
          />
        </div>

        {/* Document Table */}
        <DocumentTable
          docs={displayedDocs}
          isManagerOrAdmin={isManagerOrAdmin}
          isAdmin={profile?.role === 'admin'}
          onActionClick={(doc) => { setSelectedDoc(doc); setActionDialogOpen(true) }}
          onDeleteClick={handleDeleteDocument}
        />
      </div>

      {/* ─── Upload Dialog ─── */}
      {uploadDialogOpen && (
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-[#0b1525] border-[#1a2e4a] text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white text-base flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                Submit Document for Approval
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadDocument} className="space-y-4 mt-1">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Document Title / Policy Number</Label>
                <Input
                  placeholder="e.g. VIP Claim #8921 Endorsement"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  required
                  className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Category</Label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-white text-xs focus:border-indigo-500/50 outline-none">
                    <option>Motor Claim</option>
                    <option>Policy Endorsement</option>
                    <option>Life Proposal</option>
                    <option>Policy Cancellation</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Priority</Label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-white text-xs focus:border-indigo-500/50 outline-none">
                    <option value="Normal">Normal</option>
                    <option value="Urgent">🔥 Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Sender Note (Optional)</Label>
                <Input
                  placeholder="e.g. Customer needs immediate endorsement"
                  value={senderNote}
                  onChange={(e) => setSenderNote(e.target.value)}
                  className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1a2e4a]">
                <Label className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Attach Document</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingPdf}
                    className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl border border-[#1a2e4a] bg-[#04091a] text-slate-300 hover:bg-[#0d1a2e] hover:border-blue-500/40 text-xs transition disabled:opacity-50">
                    {isProcessingPdf
                      ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      : <Camera className="w-5 h-5 text-blue-400" />}
                    <span className="text-[10px] text-slate-400">
                      {isProcessingPdf ? 'Processing scan...' : 'Scan Document'}
                    </span>
                    <span className="text-[9px] text-slate-600">Auto-converts to PDF</span>
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl border border-[#1a2e4a] bg-[#04091a] text-slate-300 hover:bg-[#0d1a2e] hover:border-emerald-500/40 text-xs transition">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <span className="text-[10px] text-slate-400">Upload PDF</span>
                    <span className="text-[9px] text-slate-600">From device storage</span>
                  </button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePageCapture} />
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setScannedPages([]) }} />

                {scannedPages.length > 0 && (
                  <div className="p-3 bg-[#04091a] rounded-xl border border-[#1a2e4a] space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        {scannedPages.length} page{scannedPages.length > 1 ? 's' : ''} scanned
                      </span>
                      <button type="button" onClick={() => cameraInputRef.current?.click()}
                        disabled={isProcessingPdf}
                        className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-lg">
                        + Add Page
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {scannedPages.map((p) => (
                        <div key={p.id} className="relative">
                          <img src={p.preview} alt="page" className="w-12 h-16 object-cover rounded border border-[#1a2e4a] grayscale contrast-125" />
                          <button type="button" onClick={() => removeScannedPage(p.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full text-white text-[10px] flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedFile && (
                  <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                    <span className="truncate">{selectedFile.name}</span>
                    <Badge className="bg-emerald-600 text-white text-[10px] ml-2 shrink-0">PDF Ready</Badge>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-1">
                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}
                  className="border-[#1a2e4a] text-slate-400 text-xs rounded-xl">Cancel</Button>
                <Button type="submit" disabled={uploading || !selectedFile}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-xl gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  Submit Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── Endorse Dialog ─── */}
      {actionDialogOpen && (
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent className="bg-[#0b1525] border-[#1a2e4a] text-slate-100 w-[96vw] max-w-[96vw] sm:max-w-[96vw] lg:max-w-7xl h-[92vh] max-h-[96vh] flex flex-col p-4 sm:p-5 rounded-2xl">
            <DialogHeader className="shrink-0 pb-3 border-b border-[#1a2e4a]">
              <DialogTitle className="text-white text-sm sm:text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                    <Move className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  Endorsement & Stamp Placement Canvas
                </span>
                <span className="text-xs text-slate-400 font-normal truncate max-w-sm">{selectedDoc?.title}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 pt-2 overflow-hidden">
              {/* Controls Panel */}
              <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 text-xs overflow-y-auto pr-1">
                <div className="p-3 bg-[#04091a] rounded-xl border border-[#1a2e4a] space-y-1">
                  <p className="text-slate-200 font-semibold text-xs truncate">{selectedDoc?.title}</p>
                  <p className="text-slate-400 text-[11px]">{selectedDoc?.counter_name} · {selectedDoc?.submitted_by_name}</p>
                  {selectedDoc?.sender_note && (
                    <p className="text-indigo-300 text-[10px] italic mt-1 bg-indigo-950/30 p-1.5 rounded border border-indigo-500/10">"{selectedDoc.sender_note}"</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Stamp Type</Label>
                  <select value={stampType} onChange={(e) => setStampType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#04091a] border border-[#1a2e4a] text-white text-xs outline-none focus:border-indigo-500/50">
                    <option value="APPROVED">APPROVED & AUTHORIZED</option>
                    <option value="RECOMMENDED">RECOMMENDED</option>
                    <option value="VERIFIED">VERIFIED & CERTIFIED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Manager Remarks</Label>
                  <Input
                    placeholder="Optional note / instruction..."
                    value={managerNote}
                    onChange={(e) => setManagerNote(e.target.value)}
                    className="bg-[#04091a] border-[#1a2e4a] text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 leading-relaxed">
                  👆 <strong>Drag the stamp box</strong> directly onto the document preview to position the manager endorsement.
                </div>

                <div className="mt-auto pt-2 space-y-2">
                  <Button type="button" disabled={actionLoading} onClick={() => handleManagerDecision('approved')}
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 rounded-xl gap-2">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Endorse & Approve Document
                  </Button>
                  <Button type="button" variant="outline" disabled={actionLoading} onClick={() => handleManagerDecision('rejected')}
                    className="w-full h-9 border-rose-800/50 bg-rose-950/15 text-rose-400 hover:bg-rose-950/30 text-xs rounded-xl gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Reject Submission
                  </Button>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 min-h-[300px] lg:min-h-0 h-full flex flex-col bg-[#04091a] rounded-xl border border-[#1a2e4a] p-2 overflow-hidden">
                <div
                  ref={canvasRef}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={() => setIsDragging(false)}
                  className="relative w-full h-full bg-slate-900 rounded-lg shadow-inner overflow-hidden select-none cursor-crosshair flex items-center justify-center"
                  style={{ touchAction: 'none' }}
                >
                  <iframe
                    src={`${selectedDoc?.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                    loading="lazy"
                    className="w-full h-full pointer-events-none opacity-90"
                    title="Doc Preview"
                  />
                  {/* Draggable Stamp */}
                  <div
                    onMouseDown={() => setIsDragging(true)}
                    onTouchStart={(e) => { e.preventDefault(); setIsDragging(true) }}
                    style={{ left: `${stampPos.x}%`, top: `${stampPos.y}%`, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
                    className={`absolute p-2.5 rounded-lg shadow-2xl cursor-grab active:cursor-grabbing bg-white/95 backdrop-blur text-slate-900 border-2 ${
                      isDragging ? 'border-indigo-500 ring-4 ring-indigo-400/20' : 'border-emerald-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1 mb-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-800">[{stampType}]</span>
                      <Move className="w-3 h-3 text-slate-400 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-10 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold">
                        ✍️ [SIGNATURE]
                      </div>
                      <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[7px] font-bold">QR</div>
                    </div>
                    {managerNote && <p className="text-[8px] text-slate-600 font-medium mt-1 max-w-[140px] truncate">Note: {managerNote}</p>}
                    <p className="text-[7px] text-slate-400 mt-0.5">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarLayout>
  )
}

function DocumentTable({
  docs, isManagerOrAdmin, isAdmin, onActionClick, onDeleteClick
}: {
  docs: DocumentItem[]
  isManagerOrAdmin: boolean
  isAdmin: boolean
  onActionClick: (doc: DocumentItem) => void
  onDeleteClick: (doc: DocumentItem) => void
}) {
  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-[#0b1525] border border-[#1a2e4a] text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#111c35] border border-[#1a2e4a] flex items-center justify-center mb-4">
          <FileCheck className="w-7 h-7 text-slate-600" />
        </div>
        <p className="text-slate-400 text-sm font-medium">No documents found</p>
        <p className="text-slate-600 text-xs mt-1">This queue is currently empty.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#0b1525] border border-[#1a2e4a] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-[#060c1c] border-b border-[#1a2e4a] text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>Document</span>
        <span className="hidden sm:block w-28">Category</span>
        <span className="hidden md:block w-32">Counter / By</span>
        <span className="w-24 text-center">Status</span>
        <span className="w-28 text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#0f1e33]">
        {docs.map((doc) => (
          <div key={doc.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[#0d1a2e]/60 transition-colors group">
            {/* Title */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#111c35] border border-[#1a2e4a] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{doc.title}</p>
                  {doc.verification_code && (
                    <p className="text-[10px] font-mono text-indigo-400/70 truncate">{doc.verification_code}</p>
                  )}
                  {doc.manager_note && (
                    <p className="text-[10px] text-emerald-400/70 truncate">↳ {doc.manager_note}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="hidden sm:block w-28">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] border border-[#1a2e4a] bg-[#04091a] text-slate-400">
                {doc.category}
              </span>
              {doc.priority === 'Urgent' && (
                <span className="block mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-300 pulse-urgent">
                  🔥 Urgent
                </span>
              )}
            </div>

            {/* Counter / By */}
            <div className="hidden md:block w-32">
              <p className="text-[11px] font-medium text-slate-300 truncate">{doc.counter_name}</p>
              <p className="text-[10px] text-slate-500 truncate">{doc.submitted_by_name}</p>
              <p className="text-[9px] text-slate-600">{format(new Date(doc.created_at), 'dd MMM, h:mm a')}</p>
            </div>

            {/* Status */}
            <div className="w-24 flex justify-center">
              {doc.status === 'pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-300">
                  Pending
                </span>
              )}
              {doc.status === 'approved' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                  {doc.stamp_type || 'Approved'}
                </span>
              )}
              {doc.status === 'rejected' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300">
                  Rejected
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="w-28 flex items-center justify-end gap-1.5">
              {isManagerOrAdmin && doc.status === 'pending' && (
                <Button size="sm" onClick={() => onActionClick(doc)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] h-7 px-2.5 rounded-lg gap-1">
                  <PenTool className="w-3 h-3" /> Endorse
                </Button>
              )}
              {doc.status === 'approved' && (
                <div className="flex items-center gap-1">
                  <a href={`/verify?code=${doc.verification_code}`} target="_blank" rel="noreferrer"
                    className="w-7 h-7 rounded-lg border border-[#1a2e4a] bg-[#04091a] text-slate-400 hover:text-white flex items-center justify-center transition">
                    <QrCode className="w-3.5 h-3.5" />
                  </a>
                  <a href={doc.signed_file_url!} target="_blank" rel="noreferrer" download
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-[10px] font-medium">
                    <Download className="w-3 h-3" /> PDF
                  </a>
                </div>
              )}
              {isAdmin && (
                <button onClick={() => onDeleteClick(doc)}
                  className="w-7 h-7 rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-500 hover:bg-rose-900/30 hover:text-rose-300 flex items-center justify-center transition">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}