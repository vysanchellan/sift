import type { Discussion } from '@/types'

/**
 * Trend detection. Compares a topic's volume (discussion count) and engagement
 * (sum of comment counts) between the previous and current time windows and
 * flags topics with rising volume/engagement. Pure (no DB / no server-only) so
 * the math can be unit-tested with hand-computed inputs.
 */

export const TREND_MIN_WINDOW_DAYS = 1
/** Growth threshold that flips a topic to "rising". */
export const TREND_RISING_THRESHOLD = 0.25
/** Decline threshold that flips a topic to "falling". */
export const TREND_FALLING_THRESHOLD = -0.2
/** Direction labels, persisted in `trends.direction`. */
export const TREND_DIRECTIONS = ['rising', 'falling', 'steady'] as const
export type TrendDirection = (typeof TREND_DIRECTIONS)[number]

export interface TrendWindowStats {
  /** Number of discussions mentioning the topic in the window. */
  volume: number
  /** Sum of comment counts (engagement) for those discussions. */
  engagement: number
}

export interface TrendInput {
  topic: string
  previous: TrendWindowStats
  current: TrendWindowStats
}

export interface TrendResult extends TrendInput {
  /** Relative growth in volume, e.g. 0.5 = +50%. */
  volumeChange: number
  /** Relative growth in engagement, e.g. 0.5 = +50%. */
  engagementChange: number
  direction: TrendDirection
  /** 0..1 trend strength (higher = more sharply rising). */
  score: number
  /** Human-readable reasoning string. */
  reasoning: string
}

/** Relative change from `previous` to `current`, guarded against div-by-zero. */
function relativeChange(previous: number, current: number): number {
  if (previous === 0) return current === 0 ? 0 : 1
  return (current - previous) / previous
}

/**
 * Computes the trend for a single topic. Pure and deterministic: the same
 * input always yields the same direction, score, and reasoning string.
 */
export function computeTrend(input: TrendInput): TrendResult {
  const { topic, previous, current } = input

  const volumeChange = relativeChange(previous.volume, current.volume)
  const engagementChange = relativeChange(previous.engagement, current.engagement)

  // Rising when both volume and engagement are clearly growing; falling when
  // both are clearly declining; otherwise steady (mixed/flat signals).
  let direction: TrendDirection = 'steady'
  if (volumeChange >= TREND_RISING_THRESHOLD && engagementChange >= TREND_RISING_THRESHOLD) {
    direction = 'rising'
  } else if (
    volumeChange <= TREND_FALLING_THRESHOLD &&
    engagementChange <= TREND_FALLING_THRESHOLD
  ) {
    direction = 'falling'
  }

  // 0..1 strength: a blend of the two growth ratios, clamped.
  const raw = (volumeChange + engagementChange) / 2
  const score = Math.min(1, Math.max(0, raw < 0 ? 0 : raw / (1 + raw)))

  const pct = (change: number) => `${(change * 100).toFixed(0)}%`
  const reasoning = [
    `Topic "${topic}": volume ${previous.volume} -> ${current.volume} (${pct(volumeChange)}), `,
    `engagement ${previous.engagement} -> ${current.engagement} (${pct(engagementChange)}). `,
    `Direction: ${direction}.`,
  ].join('')

  return {
    topic,
    previous,
    current,
    volumeChange,
    engagementChange,
    direction,
    score,
    reasoning,
  }
}

export interface TrendDetectionOptions {
  /** Length of each window in days. Default 7. */
  windowDays?: number
  /** Reference "now" for tests. Defaults to the current time. */
  now?: Date
  /** Engagement metric to sum per topic. Default uses comment counts. */
  engagementOf?: (discussion: { num_comments?: number | null; score?: number | null }) => number
}

const defaultEngagementOf = (discussion: {
  num_comments?: number | null
  score?: number | null
}): number => discussion.num_comments ?? 0

/**
 * Aggregates discussions (each with a `published_at` timestamp and keyword
 * tags) into per-topic previous/current window stats and runs `computeTrend`
 * on each topic. Topics are the enriched keywords of the discussions.
 */
export function detectTrends(
  discussions: Array<Pick<Discussion, 'published_at' | 'keywords' | 'num_comments' | 'score'>>,
  options: TrendDetectionOptions = {}
): TrendResult[] {
  const windowDays = Math.max(TREND_MIN_WINDOW_DAYS, options.windowDays ?? 7)
  const now = options.now ?? new Date()
  const engagementOf = options.engagementOf ?? defaultEngagementOf

  const currentStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const previousStart = new Date(currentStart.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const previousStats = new Map<string, TrendWindowStats>()
  const currentStats = new Map<string, TrendWindowStats>()

  const touch = (map: Map<string, TrendWindowStats>, topic: string) => {
    const entry = map.get(topic) ?? { volume: 0, engagement: 0 }
    map.set(topic, entry)
    return entry
  }

  for (const discussion of discussions) {
    if (!discussion.published_at) continue
    const at = new Date(discussion.published_at).getTime()
    const engagement = engagementOf(discussion)
    const topics = discussion.keywords ?? []
    const target =
      at >= currentStart.getTime() && at <= now.getTime()
        ? currentStats
        : at >= previousStart.getTime() && at < currentStart.getTime()
          ? previousStats
          : null
    if (!target) continue
    for (const topic of topics) {
      const s = touch(target, topic)
      s.volume += 1
      s.engagement += engagement
    }
  }

  const topics = new Set([...previousStats.keys(), ...currentStats.keys()])
  return Array.from(topics)
    .map((topic) =>
      computeTrend({
        topic,
        previous: previousStats.get(topic) ?? { volume: 0, engagement: 0 },
        current: currentStats.get(topic) ?? { volume: 0, engagement: 0 },
      })
    )
    .filter((trend) => trend.current.volume > 0 || trend.previous.volume > 0)
}
