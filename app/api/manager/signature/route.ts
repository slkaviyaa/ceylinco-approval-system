import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'File and User ID are required' }, { status: 400 })
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

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `signature_${userId}_${Date.now()}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('signatures')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('signatures')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ signature_url: publicUrl })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, signatureUrl: publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signature upload failed' }, { status: 500 })
  }
}