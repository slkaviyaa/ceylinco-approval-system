import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    // ─── 1. Auth check — verify caller is a manager or admin ───
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No active login session found. Please sign in again.' }, { status: 401 })
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired session. Please sign in again.' }, { status: 401 })
    }

    // Fetch caller's profile to verify role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, signature_url')
      .eq('id', callerUser.id)
      .maybeSingle()

    const callerRole = (callerProfile?.role || '').toLowerCase()
    if (!callerProfile || (callerRole !== 'manager' && callerRole !== 'admin')) {
      return NextResponse.json({
        error: `Forbidden: Only Branch Managers and Administrators can endorse documents. Current role: ${callerProfile?.role || 'Unknown'}`
      }, { status: 403 })
    }

    const { documentId, managerNote, stampType, customCoordinates } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId parameter' }, { status: 400 })
    }

    // 2. Fetch document and settings
    const [docResult, settingsResult] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('id', documentId).single(),
      supabaseAdmin.from('approval_settings').select('*').eq('id', 1).maybeSingle(),
    ])

    const doc = docResult.data
    if (!doc || !doc.file_url) {
      return NextResponse.json({ error: 'Document not found or document file URL is missing' }, { status: 404 })
    }

    const settings = settingsResult.data

    // 3. Fallback signature URL: use caller's signature if available, otherwise check first manager with signature
    let signatureUrl = callerProfile.signature_url
    if (!signatureUrl) {
      const { data: fallbackManager } = await supabaseAdmin
        .from('profiles')
        .select('signature_url')
        .eq('role', 'manager')
        .not('signature_url', 'is', null)
        .limit(1)
        .maybeSingle()
      if (fallbackManager?.signature_url) {
        signatureUrl = fallbackManager.signature_url
      }
    }

    // 4. Fetch original PDF & signature image with robust error handling
    const [pdfResponse, sigResponse] = await Promise.all([
      fetch(doc.file_url).catch((err) => {
        throw new Error(`Failed to fetch original document file: ${err.message}`)
      }),
      signatureUrl ? fetch(signatureUrl).catch(() => null) : Promise.resolve(null),
    ])

    if (!pdfResponse.ok) {
      throw new Error(`Failed to load document file (Server responded with HTTP ${pdfResponse.status})`)
    }

    const pdfBytes = await pdfResponse.arrayBuffer()
    let pdfDoc: PDFDocument

    try {
      pdfDoc = await PDFDocument.load(pdfBytes)
    } catch {
      // If the file is an image instead of PDF, create a PDF wrapper
      try {
        pdfDoc = await PDFDocument.create()
        let img
        try {
          img = await pdfDoc.embedPng(pdfBytes)
        } catch {
          img = await pdfDoc.embedJpg(pdfBytes)
        }
        const page = pdfDoc.addPage([img.width, img.height])
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
      } catch (convErr: any) {
        throw new Error(`Failed to parse document as PDF or image: ${convErr.message}`)
      }
    }

    const pages = pdfDoc.getPages()
    if (pages.length === 0) {
      throw new Error('PDF document contains 0 pages')
    }

    const lastPage = pages[pages.length - 1]
    const { width, height } = lastPage.getSize()

    // 5. Calculate stamp coordinates
    let targetX: number
    let targetY: number

    if (customCoordinates && typeof customCoordinates.x === 'number') {
      targetX = (customCoordinates.x / 100) * width - 85
      targetY = height - (customCoordinates.y / 100) * height - 40
    } else {
      const pos = settings?.signature_position || 'bottom-right'
      if (pos === 'bottom-left') {
        targetX = 40
        targetY = 80
      } else if (pos === 'top-right') {
        targetX = width - 210
        targetY = height - 120
      } else {
        // bottom-right default
        targetX = width - 210
        targetY = 80
      }
    }

    // Clamp coordinates safely within printable PDF boundaries
    targetX = Math.max(20, Math.min(width - 195, targetX))
    targetY = Math.max(35, Math.min(height - 110, targetY))

    // 6. Draw signature image if available
    if (sigResponse && sigResponse.ok) {
      try {
        const sigBytes = await sigResponse.arrayBuffer()
        let sigImage
        try {
          sigImage = await pdfDoc.embedPng(sigBytes)
        } catch {
          sigImage = await pdfDoc.embedJpg(sigBytes)
        }

        lastPage.drawImage(sigImage, {
          x: targetX,
          y: targetY,
          width: 175,
          height: 70,
        })
      } catch (e) {
        console.warn('Failed to embed signature image:', e)
      }
    } else {
      // Draw signature placeholder badge if no signature image uploaded
      lastPage.drawText(`Authorized by: ${callerProfile.full_name}`, {
        x: targetX,
        y: targetY + 30,
        size: 9,
        color: rgb(0.1, 0.2, 0.45),
      })
    }

    // 7. Stamp label
    const stampLabel = `[ ${stampType || 'APPROVED'} ]`
    lastPage.drawText(stampLabel, {
      x: targetX,
      y: targetY + 75,
      size: 11,
      color: rgb(0.05, 0.45, 0.15),
    })

    // 8. Manager Remarks
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

    // 9. Timestamp
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

    // 10. QR Verification Code
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
        console.warn('QR generation error:', qrErr)
      }
    }

    // 11. Bottom watermark
    if (settings?.include_watermark !== false) {
      lastPage.drawText('Certified via Ceylinco VIP Approval Network • Powered by Ceylon Digi Solutions', {
        x: 40,
        y: 12,
        size: 7,
        color: rgb(0.55, 0.55, 0.55),
      })
    }

    // 12. Save and Upload Signed PDF
    const modifiedPdfBytes = await pdfDoc.save()
    const cleanTitle = (doc.title || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 35)
    const signedFilePath = `signed/${Date.now()}_${cleanTitle}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(signedFilePath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`)
    }

    const { data: { publicUrl: signedPublicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedFilePath)

    // 13. Update Document Record
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'approved',
        stamp_type: stampType || 'APPROVED',
        manager_note: managerNote || null,
        signed_file_url: signedPublicUrl,
        verification_code: verificationCode,
        approved_by: callerProfile.id,
        approved_by_name: callerProfile.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, signedUrl: signedPublicUrl })
  } catch (err: any) {
    console.error('Sign API Error:', err)
    return NextResponse.json({ error: err.message || 'Internal signing error' }, { status: 500 })
  }
}