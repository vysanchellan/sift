'use server'

import { createClient } from '@/lib/supabase/server'

import { runRedditImportForUser, type RedditImportResult } from './import'

export interface ImportNowResult {
  ok: boolean
  results?: RedditImportResult[]
  error?: string
  errorCode?: 'unauthenticated'
}

/**
 * Forces an immediate import of the signed-in user's Reddit sources. Returns
 * a result object instead of throwing so the UI can render errors inline.
 */
export async function importNow(): Promise<ImportNowResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, error: 'You must be signed in to import.', errorCode: 'unauthenticated' }
  }

  try {
    const results = await runRedditImportForUser(user.id, { force: true })
    return { ok: true, results }
  } catch (importError) {
    return {
      ok: false,
      error: importError instanceof Error ? importError.message : String(importError),
    }
  }
}
