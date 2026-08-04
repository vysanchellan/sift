'use server'

import { createClient } from '@/lib/supabase/server'

import {
  fetchPrioritizedDiscussions,
  type FetchPrioritizedOptions,
  type FetchPrioritizedResult,
} from './queries'

export type { FetchPrioritizedOptions, FetchPrioritizedResult }

export interface PriorityListResult {
  ok: boolean
  data?: FetchPrioritizedResult['items']
  total?: number
  error?: string
  errorCode?: 'unauthenticated'
}

/**
 * Server action: returns the signed-in user's discussions sorted and filtered
 * by priority score. Returns a result object instead of throwing so the UI can
 * render errors inline.
 */
export async function getPrioritizedDiscussions(
  options: FetchPrioritizedOptions = {}
): Promise<PriorityListResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const result = await fetchPrioritizedDiscussions(user.id, options)
  if (result.error) {
    return { ok: false, error: result.error }
  }

  return { ok: true, data: result.items, total: result.total }
}
