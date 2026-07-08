import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// API.md §0a. supabase-js owns session persistence + token refresh (defaults
// persistSession / autoRefreshToken / detectSessionInUrl are correct and are
// deliberately NOT overridden). This is the difference from MishkaHub's
// hand-rolled auth — see ARCHITECTURE.md §5.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** null = OPEN MODE: no gate, localStorage only, no realtime.
 *  Every consumer must handle the null. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

// One place for table names (API.md §0b); the old config.js SUPABASE_TABLE
// indirection retires.
export const TABLES = {
  spots: 'submitted_spots',
  slots: 'itinerary_slots',
} as const
