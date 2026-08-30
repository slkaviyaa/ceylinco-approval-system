import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

export const runtime = 'nodejs'
export const preferredRegion = ['sin1', 'bom1', 'iad1']

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    // ─── FIX 1: Auth check — verify caller is a manager or admin ───
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: no session token' }, { status: 401 })
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized: invalid session' }, { status: 401 })
    }

    // FIX 1b: Fetch caller's profile to verify role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, signature_url')
      .eq('id', callerUser.id)
      .maybeSingle()

    if (!callerProfile || (callerProfile.role !== 'manager' && callerProfile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: only managers and admins can endorse documents' }, { status: 403 })
    }

    const { documentId, managerNote, stampType, customCoordinates } = await request.json()

    // 1. Fetch document and settings
    const [docResult, settingsResult] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('id', documentId).single(),
      supabaseAdmin.from('approval_settings').select('*').eq('id', 1).maybeSingle(),
    ])

    const doc = docResult.data
    if (!doc) throw new Error('Document not found')

    const settings = settingsResult.data

    // ─── FIX 2: Use the authenticated manager's own signature ───
    const signatureUrl = callerProfile.signature_url

    // 2. Fetch original PDF & manager signature
    const [pdfResponse, sigResponse] = await Promise.all([
      fetch(doc.file_url),
      signatureUrl ? fetch(signatureUrl) : Promise.resolve(null),
    ])

    const pdfBytes = await pdfResponse.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width, height } = lastPage.getSize()

    // ─── FIX 3: Respect approval_settings.signature_position when no drag ───
    let targetX: number
    let targetY: number

    if (customCoordinates && typeof customCoordinates.x === 'number') {
      // Custom drag position from canvas
      targetX = (customCoordinates.x / 100) * width - 80
      targetY = height - (customCoordinates.y / 100) * height - 40
    } else {
      // Use settings position as default
      const pos = settings?.signature_position || 'bottom-right'
      if (pos === 'bottom-left') {
        targetX = 40
        targetY = 80
      } else if (pos === 'top-right') {
        targetX = width - 200
        targetY = height - 120
      } else {
        // bottom-right (default)
        targetX = width - 200
        targetY = 80
      }
    }

    targetX = Math.max(20, Math.min(width - 200, targetX))
    targetY = Math.max(30, Math.min(height - 100, targetY))

    // 4. Draw signature image
    if (sigResponse && sigResponse.ok) {
      try {
        const sigBytes = await sigResponse.arrayBuffer()
        const sigImage = signatureUrl!.includes('png')
          ? await pdfDoc.embedPng(sigBytes)
          : await pdfDoc.embedJpg(sigBytes)

        lastPage.drawImage(sigImage, {
          x: targetX,
          y: targetY,
          width: 175,
          height: 70,
        })
      } catch (e) {
        console.error('Failed to embed signature image:', e)
      }
    }

    // 5. Stamp label
    const stampLabel = `[ ${stampType} ]`
    lastPage.drawText(stampLabel, {
      x: targetX,
      y: targetY + 75,
      size: 11,
      color: rgb(0.05, 0.45, 0.15),
    })

    // ─── FIX 3b: Use comment_position from settings ───
    const commentBelow = !settings || settings.comment_position !== 'above-signature'
    const noteY = commentBelow ? targetY - 14 : targetY + 92

    if (managerNote && managerNote.trim().length > 0) {
      lastPage.drawText(`Note: ${managerNote}`, {
        x: targetX,
        y: noteY,
        size: 9,
        color: rgb(0.15, 0.15, 0.15),
      })
    }

    // 6. Timestamp
    const timestampStr = new Date().toLocaleString()
    if (settings?.include_datetime !== false) {
      const dtY = managerNote ? (commentBelow ? targetY - 26 : noteY - 12) : targetY - 14
      lastPage.drawText(`Date: ${timestampStr}`, {
        x: targetX,
        y: dtY,
        size: 8,
        color: rgb(0.35, 0.35, 0.35),
      })
    }

    // 7. QR Verification Code
    const verificationCode = `CEY-VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    if (settings?.include_qr !== false) {
      try {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ceylinco-approval-system.vercel.app'}/verify?code=${verificationCode}`
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 })
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
        const qrImageBytes = Buffer.from(base64Data, 'base64')
        const qrImage = await pdfDoc.embedPng(qrImageBytes)

        lastPage.drawImage(qrImage, {
          x: targetX > width / 2 ? 40 : width - 90,
          y: 40,
          width: 55,
          height: 55,
        })

        lastPage.drawText(`Code: ${verificationCode}`, {
          x: targetX > width / 2 ? 40 : width - 90,
          y: 28,
          size: 7,
          color: rgb(0.25, 0.25, 0.25),
        })
      } catch (qrErr) {
        console.error('QR generation error:', qrErr)
      }
    }

    // 8. Bottom watermark
    if (settings?.include_watermark !== false) {
      lastPage.drawText('Certified via Ceylinco VIP Approval Network • Powered by Ceylon Digi Solutions', {
        x: 40,
        y: 12,
        size: 7,
        color: rgb(0.55, 0.55, 0.55),
      })
    }

    const modifiedPdfBytes = await pdfDoc.save()
    const signedFilePath = `signed/${Date.now()}_${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    await supabaseAdmin.storage
      .from('documents')
      .upload(signedFilePath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

    const { data: { publicUrl: signedPublicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedFilePath)

    // ─── FIX 4: Track approved_by (the authenticated manager) ───
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'approved',
        stamp_type: stampType,
        manager_note: managerNote || null,
        signed_file_url: signedPublicUrl,
        verification_code: verificationCode,
        approved_by: callerProfile.id,
        approved_by_name: callerProfile.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return NextResponse.json({ success: true, signedUrl: signedPublicUrl })
  } catch (err: any) {
    console.error('Sign API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}