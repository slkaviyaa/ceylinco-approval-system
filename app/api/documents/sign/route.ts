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

    // 1. Fetch document and manager profile
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

    // 2. Fetch original PDF & Manager signature
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
    let targetX = width - 200
    let targetY = 80

    if (customCoordinates && typeof customCoordinates.x === 'number') {
      targetX = (customCoordinates.x / 100) * width - 80
      targetY = height - (customCoordinates.y / 100) * height - 40
    }

    targetX = Math.max(20, Math.min(width - 200, targetX))
    targetY = Math.max(30, Math.min(height - 100, targetY))

    // 4. Draw Signature Image with Large High-Resolution Scale
    if (sigResponse && sigResponse.ok) {
      try {
        const sigBytes = await sigResponse.arrayBuffer()
        const sigImage = signatureUrl.includes('png')
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

    // 5. Stamp Label & Remarks (Only print if manager typed a note)
    const stampLabel = `[ ${stampType} ]`
    lastPage.drawText(stampLabel, {
      x: targetX,
      y: targetY + 75,
      size: 11,
      color: rgb(0.05, 0.45, 0.15),
    })

    if (managerNote && managerNote.trim().length > 0) {
      lastPage.drawText(`Note: ${managerNote}`, {
        x: targetX,
        y: targetY - 14,
        size: 9,
        color: rgb(0.15, 0.15, 0.15),
      })
    }

    // 6. Date & Timestamp
    const timestampStr = new Date().toLocaleString()
    if (settings?.include_datetime !== false) {
      const dtY = managerNote ? targetY - 26 : targetY - 14
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

    // 8. Bottom Agency Watermark
    if (settings?.include_watermark !== false) {
      lastPage.drawText('Certified via Ceylinco VIP Approval Network • Powered by Ceylon Digi Solutions', {
        x: 40,
        y: 12,
        size: 7,
        color: rgb(0.55, 0.55, 0.55),
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
        manager_note: managerNote || null,
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