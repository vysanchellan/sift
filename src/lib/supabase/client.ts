import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database.types'

/**
 * Browser (client-component) Supabase client.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * NEVER use the service-role key here - it is not exposed to the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
