'use server'

import { createClient } from '@/lib/supabase/server'

import {
  fetchDashboardOverview,
  fetchDiscussionDetail,
  fetchDiscussionFeed,
  fetchDiscussionFilters,
  type DashboardOverview,
  type DiscussionDetail,
  type DiscussionFeedFilters,
  type DiscussionFeedResult,
  type DiscussionFilters,
} from './queries'

export interface DashboardActionResult<T> {
  ok: boolean
  data?: T
  error?: string
  errorCode?: 'unauthenticated'
}

async function requireUser(): Promise<
  { userId: string } | { error: DashboardActionResult<never> }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' } }
  }
  return { userId: user.id }
}

/**
 * Server actions that back the dashboard. Each returns a result object instead
 * of throwing so the TanStack Query hooks can map failures into error states.
 */
export async function getDashboardOverview(): Promise<DashboardActionResult<DashboardOverview>> {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const result = await fetchDashboardOverview(auth.userId)
  if (result.error || !result.data) {
    return { ok: false, error: result.error ?? 'Could not build the dashboard overview.' }
  }
  return { ok: true, data: result.data }
}

export async function getDiscussionDetail(
  discussionId: string
): Promise<DashboardActionResult<DiscussionDetail>> {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const result = await fetchDiscussionDetail(auth.userId, discussionId)
  if (result.error || !result.data) {
    return { ok: false, error: result.error ?? 'Could not load the discussion.' }
  }
  return { ok: true, data: result.data }
}

export async function getDiscussionFilters(): Promise<DashboardActionResult<DiscussionFilters>> {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const result = await fetchDiscussionFilters(auth.userId)
  if (result.error || !result.data) {
    return { ok: false, error: result.error ?? 'Could not load filter options.' }
  }
  return { ok: true, data: result.data }
}

export async function getDiscussionsFeed(
  filters: DiscussionFeedFilters = {}
): Promise<DashboardActionResult<DiscussionFeedResult>> {
  const auth = await requireUser()
  if ('error' in auth) return auth.error

  const result = await fetchDiscussionFeed(auth.userId, filters)
  if (result.error) {
    return { ok: false, error: result.error }
  }
  return { ok: true, data: result }
}
