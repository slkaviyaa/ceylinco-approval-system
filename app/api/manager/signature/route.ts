import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
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

    // Verify session
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Session token required' }, { status: 401 })
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const userId = (formData.get('userId') as string) || callerUser.id

    // Only allow caller to update their own signature unless admin
    if (userId !== callerUser.id) {
      const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', callerUser.id).maybeSingle()
      if (!callerProfile || callerProfile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Cannot modify another user signature' }, { status: 403 })
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'Signature image file is required' }, { status: 400 })
    }

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