/**
 * Resolusi konfigurasi environment dengan proteksi kunci rahasia (seperti Atlas).
 *
 * - Jika VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY (atau ANON_KEY) diisi
 *   dengan valid, aplikasi berjalan dalam mode `supabase`.
 * - Jika keduanya kosong, aplikasi otomatis berjalan dalam mode `demo` (Mode Demo
 *   Lokal dengan penyimpanan persisten di browser) sehingga pengguna dapat langsung
 *   mencoba seluruh fitur multi-tenant tanpa wajib setup server terlebih dahulu.
 * - Jika terdeteksi kunci `service_role` atau `sb_secret_` pada variabel VITE_,
 *   aplikasi menolak berjalan demi mencegah kebocoran akses lintas tenant.
 */

export type BackendMode = 'demo' | 'supabase'

export type EnvironmentResult =
  | {
      status: 'ok'
      mode: 'demo'
    }
  | {
      status: 'ok'
      mode: 'supabase'
      supabaseUrl: string
      supabasePublishableKey: string
    }
  | {
      status: 'security_error'
      problems: string[]
    }

function decodeJwtPayloadRole(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const json = atob(padded)
    const parsed = JSON.parse(json) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

export function resolveEnvironmentFromVars(vars: {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
}): EnvironmentResult {
  const url = (vars.VITE_SUPABASE_URL ?? '').trim()
  const key = (vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.VITE_SUPABASE_ANON_KEY || '').trim()

  // Neither set -> Seamless Local Demo Mode
  if (!url && !key) {
    return { status: 'ok', mode: 'demo' }
  }

  const problems: string[] = []

  if (url && !key) {
    problems.push(
      'VITE_SUPABASE_URL telah diisi, tetapi VITE_SUPABASE_PUBLISHABLE_KEY belum diisi.',
    )
  }
  if (!url && key) {
    problems.push(
      'VITE_SUPABASE_PUBLISHABLE_KEY telah diisi, tetapi VITE_SUPABASE_URL belum diisi.',
    )
  }

  if (url) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        problems.push('VITE_SUPABASE_URL wajib menggunakan protokol https:// untuk environment non-lokal.')
      }
    } catch {
      problems.push('Format VITE_SUPABASE_URL tidak valid.')
    }
  }

  if (key) {
    if (key.startsWith('sb_secret_')) {
      problems.push(
        'KEAMANAN KRITIS: Terdeteksi kunci rahasia (sb_secret_...) di variabel browser VITE_. Kunci ini melewati Row Level Security dan tidak boleh dipasang di frontend.',
      )
    }
    const jwtRole = decodeJwtPayloadRole(key)
    if (jwtRole === 'service_role' || jwtRole === 'supabase_admin') {
      problems.push(
        `KEAMANAN KRITIS: Terdeteksi token dengan role "${jwtRole}" di variabel VITE_. Gunakan hanya Publishable / Anon Key.`,
      )
    }
  }

  if (problems.length > 0) {
    return { status: 'security_error', problems }
  }

  return {
    status: 'ok',
    mode: 'supabase',
    supabaseUrl: url,
    supabasePublishableKey: key,
  }
}

export function getEnvironment(): EnvironmentResult {
  return resolveEnvironmentFromVars({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  })
}
