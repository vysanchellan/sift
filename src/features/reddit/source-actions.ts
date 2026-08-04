'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export interface SourceActionResult {
  ok: boolean
  sourceId?: string
  error?: string
  errorCode?: 'unauthenticated' | 'validation' | 'conflict'
}

export interface SourceListItem {
  id: string
  name: string
  kind: string
  externalId: string | null
  config: Record<string, unknown>
  isEnabled: boolean
  status: string
  lastSyncedAt: string | null
  createdAt: string
}

async function getAuthedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { supabase, user: null as null, authError: true }
  }
  return { supabase, user, authError: false }
}

function validateSubreddit(subreddit: string): string | null {
  const trimmed = subreddit.trim()
  if (!trimmed) return 'Subreddit name is required.'
  if (!/^[a-zA-Z0-9_]{1,21}$/.test(trimmed)) return 'Invalid subreddit name (alphanumeric + underscore, max 21 chars).'
  return null
}

/**
 * Creates a Reddit RSS source for the signed-in user.
 * `subreddits` can be a single name or comma-separated list.
 */
export async function createRedditSource(input: {
  name: string
  subreddits: string
}): Promise<SourceActionResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const nameError = validateSubreddit(input.name)
  if (nameError) return { ok: false, error: nameError, errorCode: 'validation' }

  // Parse comma-separated subreddits
  const subredditList = input.subreddits
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^\/?r\//, ''))
    .filter(Boolean)

  if (subredditList.length === 0) {
    return { ok: false, error: 'At least one valid subreddit is required.', errorCode: 'validation' }
  }

  const supabase = await createClient()

  // Use the first subreddit as external_id for the unique constraint
  const externalId = subredditList[0]

  const { data, error } = await supabase
    .from('sources')
    .insert({
      user_id: user.id,
      kind: 'reddit',
      name: input.name.trim(),
      external_id: externalId,
      config: { subreddits: subredditList },
      is_enabled: true,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'A source for this subreddit already exists.', errorCode: 'conflict' }
    }
    return { ok: false, error: `Could not create source: ${error.message}` }
  }

  revalidatePath('/dashboard')
  return { ok: true, sourceId: data.id }
}

/**
 * Deletes a source owned by the signed-in user.
 */
export async function deleteSource(sourceId: string): Promise<SourceActionResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const supabase = await createClient()

  // Verify ownership before deleting
  const { data: source, error: selectError } = await supabase
    .from('sources')
    .select('id')
    .eq('id', sourceId)
    .eq('user_id', user.id)
    .single()

  if (selectError || !source) {
    return { ok: false, error: 'Source not found.', errorCode: 'validation' }
  }

  const { error } = await supabase.from('sources').delete().eq('id', sourceId)

  if (error) {
    return { ok: false, error: `Could not delete source: ${error.message}` }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}

/**
 * Lists all sources for the signed-in user.
 */
export async function listSources(): Promise<{ ok: boolean; sources?: SourceListItem[]; error?: string }> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sources')
    .select('id, name, kind, external_id, config, is_enabled, status, last_synced_at, created_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) {
    return { ok: false, error: `Could not load sources: ${error.message}` }
  }

  const sources: SourceListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    externalId: row.external_id,
    config: row.config as Record<string, unknown>,
    isEnabled: row.is_enabled,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  }))

  return { ok: true, sources }
}