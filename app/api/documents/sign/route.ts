import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { documentId, managerNote, stampType } = await request.json()

    // 1. Fetch document and manager signature
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*, profiles!documents_submitted_by_fkey(full_name)')
      .eq('id', documentId)
      .single()

    if (docError || !doc) throw new Error('Document not found')

    // Fetch approval settings
    const { data: settings } = await supabaseAdmin
      .from('approval_settings')
      .select('*')
      .eq('id', 1)
      .single()

    // Fetch manager profile with signature
    const { data: managers } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .limit(1)

    const manager = managers?.[0]
    const signatureUrl = manager?.signature_url

    // 2. Download original PDF bytes
    const pdfResponse = await fetch(doc.file_url)
    const pdfBytes = await pdfResponse.arrayBuffer()

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width, height } = lastPage.getSize()

    // 3. Coordinate mapping based on settings
    const sigPos = settings?.signature_position || 'bottom-right'
    let sigX = width - 160
    let sigY = 60

    if (sigPos === 'bottom-left') {
      sigX = 50
      sigY = 60
    } else if (sigPos === 'top-right') {
      sigX = width - 160
      sigY = height - 120
    }

    // Draw Signature Image if available
    if (signatureUrl) {
      try {
        const sigRes = await fetch(signatureUrl)
        const sigBytes = await sigRes.arrayBuffer()
        const sigImage = signatureUrl.includes('png') 
          ? await pdfDoc.embedPng(sigBytes) 
          : await pdfDoc.embedJpg(sigBytes)

        lastPage.drawImage(sigImage, {
          x: sigX,
          y: sigY,
          width: 110,
          height: 45,
        })
      } catch (e) {
        console.error('Failed to embed signature image:', e)
      }
    }

    // 4. Date & Time & Comment Placement
    const timestampStr = new Date().toLocaleString()
    const commentText = managerNote ? `Note: ${managerNote}` : 'Authorized & Endorsed'
    const stampLabel = `[ ${stampType} ]`

    let commentY = sigY - 15
    if (settings?.comment_position === 'above-signature') {
      commentY = sigY + 55
    }

    lastPage.drawText(stampLabel, {
      x: sigX,
      y: commentY + 12,
      size: 9,
      color: rgb(0.1, 0.5, 0.2),
    })

    lastPage.drawText(commentText, {
      x: sigX,
      y: commentY,
      size: 8,
      color: rgb(0.2, 0.2, 0.2),
    })

    if (settings?.include_datetime !== false) {
      const dtY = settings?.datetime_position === 'attached-to-comment' ? commentY - 10 : sigY - 25
      lastPage.drawText(`Date: ${timestampStr}`, {
        x: sigX,
        y: dtY,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      })
    }

    // 5. Verification Code & QR Code Generation
    const verificationCode = `CEY-VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    if (settings?.include_qr !== false) {
      try {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ceylinco-approval-system.vercel.app'}/verify?code=${verificationCode}`
        const qrDataUrl = await QRCode.toDataURL(verifyUrl)
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
        const qrImageBytes = Buffer.from(base64Data, 'base64')
        const qrImage = await pdfDoc.embedPng(qrImageBytes)

        lastPage.drawImage(qrImage, {
          x: sigPos === 'bottom-left' ? width - 90 : 50,
          y: 50,
          width: 50,
          height: 50,
        })

        lastPage.drawText(`Verify Code: ${verificationCode}`, {
          x: sigPos === 'bottom-left' ? width - 110 : 50,
          y: 38,
          size: 6,
          color: rgb(0.3, 0.3, 0.3),
        })
      } catch (qrErr) {
        console.error('QR generation error:', qrErr)
      }
    }

    // 6. Watermark
    if (settings?.include_watermark !== false) {
      lastPage.drawText('Certified via Ceylinco VIP Approval Network • Powered by Ceylon Digi Solutions', {
        x: 50,
        y: 20,
        size: 6,
        color: rgb(0.6, 0.6, 0.6),
      })
    }

    // 7. Save Signed PDF
    const modifiedPdfBytes = await pdfDoc.save()
    const signedFilePath = `signed/${Date.now()}_${doc.title}.pdf`

    await supabaseAdmin.storage
      .from('documents')
      .upload(signedFilePath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

    const { data: { publicUrl: signedPublicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedFilePath)

    // Update DB record
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'approved',
        stamp_type: stampType,
        manager_note: managerNote,
        signed_file_url: signedPublicUrl,
        verification_code: verificationCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    return NextResponse.json({ success: true, signedUrl: signedPublicUrl })
  } catch (err: any) {
    console.error('Sign API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}