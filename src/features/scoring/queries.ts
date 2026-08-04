import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Discussion, DiscussionPriority } from '@/types'

/**
 * Server function for listing discussions sorted and filtered by their
 * transparent priority score. Reads `discussion_priority` joined with
 * `discussions` and supports filters on score range, category, subreddit, and
 * keyword overlap, plus pagination. Never throws; errors are returned on the
 * result so callers (server actions / UI) can render them inline.
 */

export interface PrioritizedDiscussionItem {
  discussion: Discussion
  priority: Pick<
    DiscussionPriority,
    'score' | 'components' | 'reasoning' | 'scored_at' | 'version' | 'provider'
  >
}

export interface FetchPrioritizedOptions {
  /** Sort by priority score (default) or by a single factor inside components. */
  sortBy?:
    | 'score'
    | 'buyingIntent'
    | 'urgency'
    | 'competition'
    | 'visibility'
    | 'engagement'
    | 'topicGrowth'
  order?: 'asc' | 'desc'
  minScore?: number
  maxScore?: number
  category?: string
  subreddit?: string
  /** Match discussions whose keywords overlap this topic. */
  topic?: string
  limit?: number
  offset?: number
}

export interface FetchPrioritizedResult {
  items: PrioritizedDiscussionItem[]
  total: number
  error?: string
}

const COMPONENT_SORT: Record<Exclude<FetchPrioritizedOptions['sortBy'], undefined>, string> = {
  score: 'score',
  buyingIntent: 'components->buyingIntent',
  urgency: 'components->urgency',
  competition: 'components->competition',
  visibility: 'components->visibility',
  engagement: 'components->engagement',
  topicGrowth: 'components->topicGrowth',
}

export async function fetchPrioritizedDiscussions(
  userId: string,
  options: FetchPrioritizedOptions = {}
): Promise<FetchPrioritizedResult> {
  const supabase = createAdminClient()
  const limit = Math.min(200, Math.max(1, options.limit ?? 50))
  const offset = Math.max(0, options.offset ?? 0)
  const sortBy = options.sortBy ?? 'score'
  const order = options.order ?? 'desc'

  let query = supabase
    .from('discussion_priority')
    .select('score, components, reasoning, scored_at, version, provider, discussions(*)', {
      count: 'exact',
    })
    .eq('user_id', userId)

  if (options.minScore !== undefined) query = query.gte('score', options.minScore)
  if (options.maxScore !== undefined) query = query.lte('score', options.maxScore)
  if (options.category) query = query.eq('discussions.category', options.category)
  if (options.subreddit) query = query.eq('discussions.subreddit', options.subreddit)
  if (options.topic) query = query.overlaps('discussions.keywords', [options.topic])

  query = query
    .order(COMPONENT_SORT[sortBy], { ascending: order === 'asc' })
    .order('scored_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    return {
      items: [],
      total: 0,
      error: `Could not load prioritized discussions: ${error.message}`,
    }
  }

  const items: PrioritizedDiscussionItem[] = (data ?? []).flatMap((row) => {
    if (!row.discussions) return []
    return [
      {
        discussion: row.discussions as Discussion,
        priority: {
          score: row.score,
          components: row.components,
          reasoning: row.reasoning,
          scored_at: row.scored_at,
          version: row.version,
          provider: row.provider,
        },
      },
    ]
  })

  return { items, total: count ?? items.length }
}
