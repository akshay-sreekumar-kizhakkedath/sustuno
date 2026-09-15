import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qwbztkumlcwqtkjpvoca.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key'

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Using fallback configuration so the dashboard remains functional.',
  )
}

export const supabase = createClient(rawUrl, rawKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})

