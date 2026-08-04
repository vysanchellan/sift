import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

/**
 * Service-role Supabase client for server-side admin operations.
 *
 * - Bypasses RLS, so ONLY call it from trusted server code (never from a
 *   browser bundle; enforced by the `server-only` import).
 * - Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * - Sessions are disabled - this client never reads or writes auth cookies.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
