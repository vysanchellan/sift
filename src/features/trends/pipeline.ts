import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Discussion, Trend } from '@/types'

import { detectTrends, type TrendResult } from './trends'

/**
 * Trend detection pipeline. Loads the user's discussions published within the
 * lookback window, aggregates them into per-topic trends (volume + engagement
 * delta between the previous and current windows), and upserts the results
 * into the `trends` table (unique on user_id + topic + window_start).
 */

export const TREND_WINDOW_DAYS = 7
export const TREND_PROVIDER = 'trends'

export interface TrendDetectionRunResult {
  considered: number
  trends: TrendResult[]
  error?: string
}

function toTrendRow(
  trend: TrendResult,
  userId: string,
  windowStart: string
): Omit<Trend, 'id' | 'created_at'> {
  return {
    user_id: userId,
    topic: trend.topic,
    window_start: windowStart,
    window_end: new Date(
      new Date(windowStart).getTime() + TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
    volume_previous: trend.previous.volume,
    volume_current: trend.current.volume,
    engagement_previous: trend.previous.engagement,
    engagement_current: trend.current.engagement,
    volume_change: Math.round(trend.volumeChange * 1000) / 1000,
    engagement_change: Math.round(trend.engagementChange * 1000) / 1000,
    direction: trend.direction,
    score: Math.round(trend.score * 1000) / 1000,
    reasoning: trend.reasoning,
  }
}

export async function detectTrendsForUser(
  userId: string,
  options: { windowDays?: number } = {}
): Promise<TrendDetectionRunResult> {
  const windowDays = options.windowDays ?? TREND_WINDOW_DAYS
  const supabase = createAdminClient()

  const now = new Date()
  const lookbackStart = new Date(now.getTime() - 2 * windowDays * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('discussions')
    .select('id, published_at, keywords, num_comments, score')
    .eq('user_id', userId)
    .gte('published_at', lookbackStart.toISOString())

  if (error) {
    return { considered: 0, trends: [], error: `Could not load discussions: ${error.message}` }
  }

  const trends = detectTrends(
    data as Array<Pick<Discussion, 'published_at' | 'keywords' | 'num_comments' | 'score'>>,
    {
      windowDays,
      now,
    }
  )

  if (trends.length > 0) {
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString()
    const rows = trends.map((trend) => toTrendRow(trend, userId, windowStart))

    const { error: upsertError } = await supabase
      .from('trends')
      .upsert(rows, { onConflict: 'user_id,topic,window_start' })

    if (upsertError) {
      return {
        considered: (data ?? []).length,
        trends,
        error: `Could not save trends: ${upsertError.message}`,
      }
    }
  }

  return { considered: (data ?? []).length, trends }
}
