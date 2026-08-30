import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseBrowserInstance: ReturnType<typeof createSupabaseClient> | null = null

export const createClient = () => {
  if (typeof window === 'undefined') {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  if (!supabaseBrowserInstance) {
    supabaseBrowserInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'ceylinco_auth_session',
        },
      }
    )
  }

  return supabaseBrowserInstance
}