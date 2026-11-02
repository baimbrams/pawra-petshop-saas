import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import { getEnvironment } from '@/lib/config/env'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  const env = getEnvironment()
  if (env.status !== 'ok' || env.mode !== 'supabase') {
    return null
  }
  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return cachedClient
}
