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

    // Verify caller has valid admin session
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication token required' }, { status: 401 })
    }

    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin session' }, { status: 401 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .maybeSingle()

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only system administrators can create accounts' }, { status: 403 })
    }

    const { username, password, full_name, role, counter_name } = await req.json()

    if (!username || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Clean username (lowercase, remove spaces)
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '')
    const internalEmail = `${sanitizedUsername}@counter.ceylinco.lk`

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', sanitizedUsername)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken. Please choose another.' }, { status: 400 })
    }

    // 1. Create the user in Supabase Auth using internal mapping
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        counter_name: role === 'counter' ? counter_name : 'Dehiattakandiya_Main',
        username: sanitizedUsername,
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 2. Ensure profile entry is saved with username
    if (authData.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        email: internalEmail,
        username: sanitizedUsername,
        full_name,
        role,
        counter_name: role === 'counter' ? counter_name : 'Dehiattakandiya_Main',
      })
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}