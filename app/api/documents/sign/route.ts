import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export async function POST(req: Request) {
  try {
    const { documentId, managerNote, stampType } = await req.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const verificationCode = doc.verification_code || `CEY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const { data: managerProfile } = await supabaseAdmin
      .from('profiles')
      .select('signature_url, full_name')
      .eq('role', 'manager')
      .not('signature_url', 'is', null)
      .limit(1)
      .maybeSingle()

    const pdfResponse = await fetch(doc.file_url)
    if (!pdfResponse.ok) throw new Error('Failed to fetch original PDF')
    const pdfBytes = await pdfResponse.arrayBuffer()

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const { width } = lastPage.getSize()

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Generate Verification QR Code
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const verifyUrl = `${origin}/verify?code=${verificationCode}`
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 })
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64')
    const qrPdfImage = await pdfDoc.embedPng(qrImageBytes)

    const boxWidth = 260
    const boxHeight = 110
    const margin = 20
    const boxX = width - boxWidth - margin
    const boxY = margin

    lastPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.15, 0.35, 0.75),
      borderWidth: 1.5,
    })

    let headerText = 'DIGITALLY PROCESSED'
    let titleColor = rgb(0.15, 0.55, 0.25)

    if (stampType === 'APPROVED') {
      headerText = 'APPROVED & AUTHORIZED'
      titleColor = rgb(0.1, 0.6, 0.2)
    } else if (stampType === 'RECOMMENDED') {
      headerText = 'OFFICIALLY RECOMMENDED'
      titleColor = rgb(0.8, 0.45, 0.1)
    } else if (stampType === 'VERIFIED') {
      headerText = 'VERIFIED & CERTIFIED'
      titleColor = rgb(0.15, 0.4, 0.8)
    } else if (stampType === 'SIGN_ONLY') {
      headerText = 'OFFICIAL ENDORSEMENT'
      titleColor = rgb(0.2, 0.2, 0.2)
    }

    lastPage.drawText('CEYLINCO GENERAL INSURANCE', {
      x: boxX + 10,
      y: boxY + boxHeight - 14,
      size: 8,
      font: helveticaBold,
      color: rgb(0.1, 0.2, 0.6),
    })

    lastPage.drawText(headerText, {
      x: boxX + 10,
      y: boxY + boxHeight - 25,
      size: 7.5,
      font: helveticaBold,
      color: titleColor,
    })

    const signDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    lastPage.drawText(`Branch: Dehiattakandiya`, {
      x: boxX + 10,
      y: boxY + boxHeight - 38,
      size: 7,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    })

    lastPage.drawText(`Date: ${signDate}`, {
      x: boxX + 10,
      y: boxY + boxHeight - 48,
      size: 7,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    })

    lastPage.drawText(`Code: ${verificationCode}`, {
      x: boxX + 10,
      y: boxY + boxHeight - 58,
      size: 6.5,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    })

    const noteText = managerNote ? `Note: ${managerNote.slice(0, 30)}` : 'Document Processed'
    lastPage.drawText(noteText, {
      x: boxX + 10,
      y: boxY + 10,
      size: 6.5,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Draw Signature Image
    if (managerProfile?.signature_url) {
      try {
        const sigRes = await fetch(managerProfile.signature_url)
        if (sigRes.ok) {
          const sigBytes = await sigRes.arrayBuffer()
          const sigImg = managerProfile.signature_url.toLowerCase().endsWith('.png')
            ? await pdfDoc.embedPng(sigBytes)
            : await pdfDoc.embedJpg(sigBytes)

          lastPage.drawImage(sigImg, {
            x: boxX + 125,
            y: boxY + 38,
            width: 65,
            height: 32,
          })
        }
      } catch (e) {
        console.error('Signature embed error:', e)
      }
    }

    // Draw QR Code
    lastPage.drawImage(qrPdfImage, {
      x: boxX + boxWidth - 62,
      y: boxY + 12,
      width: 54,
      height: 54,
    })

    const modifiedPdfBytes = await pdfDoc.save()
    const signedFileName = `signed/${Date.now()}_endorsed_${documentId}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(signedFileName, modifiedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signedFileName)

    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'approved',
        stamp_type: stampType || 'APPROVED',
        manager_note: managerNote || 'Processed digitally',
        signed_file_url: publicUrl,
        verification_code: verificationCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, signedUrl: publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error processing document' }, { status: 500 })
  }
}