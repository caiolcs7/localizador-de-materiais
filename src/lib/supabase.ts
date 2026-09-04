import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase: SupabaseClient<Database> | null = url && publishableKey
  ? createClient<Database>(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'localizador-materiais-auth',
      },
      realtime: { params: { eventsPerSecond: 4 } },
    })
  : null

export function requireSupabase() {
  if (!supabase) throw new Error('A conexão com o banco de dados não está configurada.')
  return supabase
}

export const isSupabaseConfigured = Boolean(supabase)
