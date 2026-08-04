import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Discussion, Json, Trend } from '@/types'

import { computePriority, type PriorityComponents, type PriorityResult } from './priority'

/**
 * Priority pipeline. Recomputes the transparent 0-100 priority score for the
 * user's enriched discussions and upserts it into `discussion_priority`
 * (unique on discussion_id + provider + version). Uses the persisted enrichment
 * signals (intent/urgency/competition), the discussion's own metrics (upvotes,
 * comments), and the latest trend score for the discussion's topic.
 */

export const PRIORITY_PROVIDER = 'priority'
export const PRIORITY_VERSION = 'v1'

export interface PriorityRunResult {
  considered: number
  scored: number
  failed: number
  errors: string[]
}

interface ScoreRow {
  discussion_id: string
  signals: {
    intent?: { label?: string; confidence?: number }
    urgency?: { label?: string; confidence?: number }
    competition?: { label?: string; confidence?: number }
  }
}

function asSignal(signals: ScoreRow['signals'], key: 'intent' | 'urgency' | 'competition') {
  const value = signals[key]
  return {
    label: value?.label ?? 'medium',
    confidence: value?.confidence ?? 0.5,
  }
}

/** Best trend growth (0..1) for a discussion's topic, or null when unknown. */
function topicGrowthFor(discussion: Discussion, trends: Trend[]): number | null {
  const topics = new Set([discussion.category, ...(discussion.keywords ?? [])].filter(Boolean))
  if (topics.size === 0) return null
  const matches = trends.filter((t) => topics.has(t.topic))
  if (matches.length === 0) return null
  return Math.max(...matches.map((t) => Number(t.score)))
}

function componentsToJson(components: PriorityComponents): Json {
  return components as unknown as Json
}

export async function recomputePrioritiesForUser(
  userId: string,
  options: { limit?: number } = {}
): Promise<PriorityRunResult> {
  const supabase = createAdminClient()
  const result: PriorityRunResult = { considered: 0, scored: 0, failed: 0, errors: [] }

  const { data: discussions, error: discussionsError } = await supabase
    .from('discussions')
    .select('id, user_id, title, score, num_comments, category, keywords')
    .eq('user_id', userId)
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 500)

  if (discussionsError) {
    throw new Error(`Could not load enriched discussions: ${discussionsError.message}`)
  }

  const enriched = (discussions ?? []) as Discussion[]
  result.considered = enriched.length
  if (enriched.length === 0) return result

  const ids = enriched.map((d) => d.id)

  const { data: scoreRows, error: scoresError } = await supabase
    .from('discussion_scores')
    .select('discussion_id, signals')
    .in('discussion_id', ids)
    .eq('user_id', userId)

  if (scoresError) {
    throw new Error(`Could not load discussion scores: ${scoresError.message}`)
  }

  const { data: trends, error: trendsError } = await supabase
    .from('trends')
    .select('topic, score')
    .eq('user_id', userId)

  if (trendsError) {
    throw new Error(`Could not load trends: ${trendsError.message}`)
  }

  const scoresById = new Map<string, ScoreRow[]>()
  for (const row of (scoreRows ?? []) as ScoreRow[]) {
    const list = scoresById.get(row.discussion_id) ?? []
    list.push(row)
    scoresById.set(row.discussion_id, list)
  }

  const upsertRows: Array<{
    user_id: string
    discussion_id: string
    provider: string
    version: string
    score: number
    components: Json
    reasoning: string
  }> = []

  for (const discussion of enriched) {
    try {
      const scoreList = scoresById.get(discussion.id) ?? []
      // Prefer the most recent score row that carries signal data.
      const scoreRow = scoreList.find((s) => s.signals && typeof s.signals === 'object')
      if (!scoreRow) {
        result.failed++
        result.errors.push(`${discussion.id}: no enrichment scores found`)
        continue
      }

      const signals = (scoreRow.signals ?? {}) as ScoreRow['signals']
      const input: Parameters<typeof computePriority>[0] = {
        signals: {
          intent: asSignal(signals, 'intent'),
          urgency: asSignal(signals, 'urgency'),
          competition: asSignal(signals, 'competition'),
        },
        metrics: {
          score: discussion.score,
          numComments: discussion.num_comments,
        },
        topicGrowth: topicGrowthFor(discussion, (trends ?? []) as Trend[]),
      }
      const priority: PriorityResult = computePriority(input)

      upsertRows.push({
        user_id: userId,
        discussion_id: discussion.id,
        provider: PRIORITY_PROVIDER,
        version: PRIORITY_VERSION,
        score: priority.score,
        components: componentsToJson(priority.components),
        reasoning: priority.reasoning,
      })
      result.scored++
    } catch (error) {
      result.failed++
      result.errors.push(
        `${discussion.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('discussion_priority')
      .upsert(upsertRows, { onConflict: 'discussion_id,provider,version' })
    if (upsertError) {
      throw new Error(`Could not save priorities: ${upsertError.message}`)
    }
  }

  return result
}
