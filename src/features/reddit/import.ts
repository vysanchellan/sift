import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { RedditRssProvider } from '@/server/providers/reddit'
import { getSourceProvider, hasSourceProvider, registerSourceProvider } from '@/server/providers'
import type { Source } from '@/types'

/**
 * How long to wait between imports of the same source. RSS feeds are only
 * polled at most this often per source, so Reddit is not hit more frequently.
 */
export const REDDIT_POLLING_INTERVAL_MS = 5 * 60 * 1000

export interface RedditImportResult {
  sourceId: string
  sourceName: string
  subreddits: string[]
  /** false when the source was skipped because it synced recently. */
  attempted: boolean
  imported: number
  deduped: number
  error?: string
}

/**
 * Wire the concrete provider into the registry once per process. Callers below
 * go through the registry, so they only ever depend on the interface.
 */
function redditProvider() {
  if (!hasSourceProvider('reddit')) {
    registerSourceProvider(new RedditRssProvider())
  }
  return getSourceProvider('reddit')
}

function toRow(item: ReturnType<RedditRssProvider['normalizeItem']>, source: Source) {
  return {
    user_id: source.user_id,
    source_id: source.id,
    external_id: item.externalId,
    title: item.title,
    body: item.body,
    url: item.url,
    author: item.author,
    score: item.score,
    num_comments: item.numComments,
    upvote_ratio: item.upvoteRatio,
    published_at: item.publishedAt,
    tags: item.tags,
    metadata: item.metadata,
    subreddit: item.subreddit,
  }
}

/**
 * Imports one Reddit source (all configured subreddits) into `discussions`.
 * Dedupes on the entry's Reddit id (`external_id`), batches the insert, and
 * updates `sources.last_synced_at` on success. Never throws; errors are
 * reported on the result so callers can surface them.
 */
export async function runRedditImport(
  source: Source,
  options: { force?: boolean } = {}
): Promise<RedditImportResult> {
  const config = (source.config ?? {}) as { subreddits?: string[] | string }
  const subreddits = Array.isArray(config.subreddits) ? config.subreddits : []
  const base: Pick<RedditImportResult, 'sourceId' | 'sourceName' | 'subreddits'> = {
    sourceId: source.id,
    sourceName: source.name,
    subreddits,
  }

  if (!options.force && source.last_synced_at) {
    const elapsed = Date.now() - new Date(source.last_synced_at).getTime()
    if (elapsed < REDDIT_POLLING_INTERVAL_MS) {
      return { ...base, attempted: false, imported: 0, deduped: 0 }
    }
  }

  const provider = redditProvider()

  let rawItems
  try {
    rawItems = await provider.fetchDiscussions(source)
  } catch (error) {
    return {
      ...base,
      attempted: true,
      imported: 0,
      deduped: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  const supabase = createAdminClient()

  const { data: existing, error: selectError } = await supabase
    .from('discussions')
    .select('external_id')
    .eq('source_id', source.id)

  if (selectError) {
    return {
      ...base,
      attempted: true,
      imported: 0,
      deduped: 0,
      error: `Could not check existing discussions: ${selectError.message}`,
    }
  }

  const seen = new Set((existing ?? []).map((row) => row.external_id))
  const rows: Array<ReturnType<typeof toRow>> = []
  let deduped = 0

  for (const raw of rawItems) {
    const item = provider.normalizeItem(raw)
    if (seen.has(item.externalId) || !item.externalId) {
      deduped++
      continue
    }
    seen.add(item.externalId)
    rows.push(toRow(item, source))
  }

  let imported = 0
  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('discussions').insert(rows)
    if (insertError) {
      return {
        ...base,
        attempted: true,
        imported: 0,
        deduped,
        error: `Insert failed: ${insertError.message}`,
      }
    }
    imported = rows.length
  }

  await supabase
    .from('sources')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', source.id)

  return { ...base, attempted: true, imported, deduped }
}

/**
 * Imports every enabled Reddit source for a user and returns one result per
 * source. Used by server actions / scheduled jobs.
 */
export async function runRedditImportForUser(
  userId: string,
  options: { force?: boolean } = {}
): Promise<RedditImportResult[]> {
  const supabase = createAdminClient()
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .eq('user_id', userId)
    .eq('kind', 'reddit')
    .eq('is_enabled', true)

  if (error) {
    throw new Error(`Could not load Reddit sources: ${error.message}`)
  }

  const results: RedditImportResult[] = []
  for (const source of sources ?? []) {
    results.push(await runRedditImport(source, options))
  }
  return results
}
