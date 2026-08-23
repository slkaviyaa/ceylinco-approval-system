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
    const { documentId, managerNote, stampType, customCoordinates } = await request.json()

    // 1. Fetch document and manager profile in parallel
    const [docResult, settingsResult, managersResult] = await Promise.all([
      supabaseAdmin.from('documents').select('*').eq('id', documentId).single(),
      supabaseAdmin.from('approval_settings').select('*').eq('id', 1).maybeSingle(),
      supabaseAdmin.from('profiles').select('*').eq('role', 'manager').limit(1),
    ])

    const doc = docResult.data
    if (!doc) throw new Error('Document not found')

    const settings = settingsResult.data
    const manager = managersResult.data?.[0]
    const signatureUrl = manager?.signature_url

    // 2. Fetch original PDF & Manager signature in parallel
    const [pdfResponse, sigResponse] = await Promise.all([
      fetch(doc.file_url),
      signatureUrl ? fetch(signatureUrl) : Promise.resolve(null),
    ])

    const pdfBytes = await pdfResponse.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width, height } = lastPage.getSize()

    // 3. Exact target coordinates mapping
    let targetX = width - 180
    let targetY = 70

    if (customCoordinates && typeof customCoordinates.x === 'number') {
      targetX = (customCoordinates.x / 100) * width - 60
      targetY = height - (customCoordinates.y / 100) * height - 30
    }

    targetX = Math.max(20, Math.min(width - 160, targetX))
    targetY = Math.max(30, Math.min(height - 70, targetY))

    // 4. Draw Signature Image
    if (sigResponse && sigResponse.ok) {
      try {
        const sigBytes = await sigResponse.arrayBuffer()
        const sigImage = signatureUrl.includes('png')
          ? await pdfDoc.embedPng(sigBytes)
          : await pdfDoc.embedJpg(sigBytes)

        lastPage.drawImage(sigImage, {
          x: targetX,
          y: targetY,
          width: 95,
          height: 38,
        })
      } catch (e) {
        console.error('Failed to embed signature image:', e)
      }
    }

    // 5. Date & Manager Remarks
    const timestampStr = new Date().toLocaleString()
    const commentText = managerNote ? `Note: ${managerNote}` : 'Authorized & Endorsed'
    const stampLabel = `[ ${stampType} ]`

    lastPage.drawText(stampLabel, {
      x: targetX,
      y: targetY + 42,
      size: 9,
      color: rgb(0.1, 0.5, 0.2),
    })

    lastPage.drawText(commentText, {
      x: targetX,
      y: targetY - 10,
      size: 8,
      color: rgb(0.2, 0.2, 0.2),
    })

    if (settings?.include_datetime !== false) {
      lastPage.drawText(`Date: ${timestampStr}`, {
        x: targetX,
        y: targetY - 20,
        size: 7,
        color: rgb(0.4, 0.4, 0.4),
      })
    }

    // 6. Verification Code & QR
    const verificationCode = `CEY-VIP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    if (settings?.include_qr !== false) {
      try {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ceylinco-approval-system.vercel.app'}/verify?code=${verificationCode}`
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 })
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
        const qrImageBytes = Buffer.from(base64Data, 'base64')
        const qrImage = await pdfDoc.embedPng(qrImageBytes)

        lastPage.drawImage(qrImage, {
          x: targetX > width / 2 ? 40 : width - 80,
          y: 40,
          width: 45,
          height: 45,
        })

        lastPage.drawText(`Code: ${verificationCode}`, {
          x: targetX > width / 2 ? 40 : width - 80,
          y: 30,
          size: 6,
          color: rgb(0.3, 0.3, 0.3),
        })
      } catch (qrErr) {
        console.error('QR generation error:', qrErr)
      }
    }

    // 7. Watermark
    if (settings?.include_watermark !== false) {
      lastPage.drawText('Certified via Ceylinco VIP Approval Network • Powered by Ceylon Digi Solutions', {
        x: 40,
        y: 15,
        size: 6,
        color: rgb(0.6, 0.6, 0.6),
      })
    }

    const modifiedPdfBytes = await pdfDoc.save()
    const signedFilePath = `signed/${Date.now()}_${doc.title}.pdf`

    await supabaseAdmin.storage
      .from('documents')
      .upload(signedFilePath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

    const { data: { publicUrl: signedPublicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedFilePath)

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