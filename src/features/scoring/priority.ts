import type { SignalScore } from '@/features/enrichment/enrich'

/**
 * Transparent priority scoring. Combines six normalized factors into a single
 * 0-100 score and returns a human-readable reasoning string explaining the
 * "why" (the score is never a black box). This module is pure (no DB, no
 * server-only) so the formula can be unit-tested with hand-computed inputs.
 *
 * Factors and weights (must sum to 1):
 *   - buyingIntent  0.30  high/medium/low intent signal
 *   - urgency       0.20  urgency signal
 *   - competition   0.15  inverted (low competition scores higher)
 *   - visibility    0.10  logistic of the discussion's upvotes
 *   - engagement    0.10  logistic of the discussion's comment count
 *   - topicGrowth   0.15  trend score for the discussion's topic (0..1)
 */

export const PRIORITY_WEIGHTS = {
  buyingIntent: 0.3,
  urgency: 0.2,
  competition: 0.15,
  visibility: 0.1,
  engagement: 0.1,
  topicGrowth: 0.15,
} as const

/** Upvotes at which the visibility factor reaches 0.5. */
export const VISIBILITY_HALF_POINT = 100
/** Comments at which the engagement factor reaches 0.5. */
export const ENGAGEMENT_HALF_POINT = 20
/** Fallback for unknown trends: neutral, neither rewards nor penalizes. */
export const NEUTRAL_TOPIC_GROWTH = 0.5

export interface PrioritySignals {
  intent: SignalScore
  urgency: SignalScore
  competition: SignalScore
}

export interface PriorityMetrics {
  /** Reddit upvotes (null when the source does not expose them). */
  score: number | null
  /** Comment count (null when the source does not expose it). */
  numComments: number | null
}

export interface PriorityComponents {
  buyingIntent: number
  urgency: number
  competition: number
  visibility: number
  engagement: number
  topicGrowth: number
}

export interface PriorityInput {
  signals: PrioritySignals
  metrics: PriorityMetrics
  /** Trend score (0..1) for the discussion's topic; null/undefined = neutral. */
  topicGrowth?: number | null
}

export interface PriorityResult {
  /** 0-100 integer priority score. */
  score: number
  /** Normalized (0..1) factor values, for storage alongside the score. */
  components: PriorityComponents
  /** Human-readable explanation of how the score was derived. */
  reasoning: string
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Confidence-adjusted signal value: regresses toward neutral when uncertain. */
function signalFactor(label: string, confidence: number): number {
  const c = clamp01(confidence)
  return labelValue(label) * c + 0.5 * (1 - c)
}

function labelValue(label: string): number {
  switch (label.toLowerCase()) {
    case 'high':
      return 1
    case 'medium':
      return 0.5
    case 'low':
      return 0
    default:
      return 0.5
  }
}

/** Logistic normalization: x / (x + halfPoint), mapping 0 -> 0, half -> 0.5. */
function logistic(x: number | null | undefined, halfPoint: number): number {
  const value = x ?? 0
  if (value <= 0) return 0
  return value / (value + halfPoint)
}

function points(weight: number, factor: number): number {
  return weight * 100 * factor
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function computePriority(input: PriorityInput): PriorityResult {
  const { signals, metrics, topicGrowth } = input

  const buyingIntent = signalFactor(signals.intent.label, signals.intent.confidence)
  const urgency = signalFactor(signals.urgency.label, signals.urgency.confidence)
  const competition = 1 - signalFactor(signals.competition.label, signals.competition.confidence)
  const visibility = logistic(metrics.score, VISIBILITY_HALF_POINT)
  const engagement = logistic(metrics.numComments, ENGAGEMENT_HALF_POINT)
  const growth =
    topicGrowth === null || topicGrowth === undefined ? NEUTRAL_TOPIC_GROWTH : topicGrowth

  const components: PriorityComponents = {
    buyingIntent: round2(buyingIntent),
    urgency: round2(urgency),
    competition: round2(competition),
    visibility: round2(visibility),
    engagement: round2(engagement),
    topicGrowth: round2(clamp01(growth)),
  }

  const weighted =
    PRIORITY_WEIGHTS.buyingIntent * buyingIntent +
    PRIORITY_WEIGHTS.urgency * urgency +
    PRIORITY_WEIGHTS.competition * competition +
    PRIORITY_WEIGHTS.visibility * visibility +
    PRIORITY_WEIGHTS.engagement * engagement +
    PRIORITY_WEIGHTS.topicGrowth * clamp01(growth)

  const score = Math.round(clamp01(weighted) * 100)

  const fmt = (value: number) => value.toFixed(1)
  const labelOf = (label: string) => label.toLowerCase()

  const reasoning = [
    `Priority ${score}/100.`,
    `Buying intent: ${labelOf(signals.intent.label)} (conf ${fmt(signals.intent.confidence)}) ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.buyingIntent, buyingIntent))} pts.`,
    `Urgency: ${labelOf(signals.urgency.label)} (conf ${fmt(signals.urgency.confidence)}) ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.urgency, urgency))} pts.`,
    `Competition: ${labelOf(signals.competition.label)} (conf ${fmt(signals.competition.confidence)}) ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.competition, competition))} pts (low competition scores higher).`,
    `Visibility: ${metrics.score ?? 'n/a'} upvotes -> ${fmt(visibility)} ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.visibility, visibility))} pts.`,
    `Engagement: ${metrics.numComments ?? 'n/a'} comments -> ${fmt(engagement)} ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.engagement, engagement))} pts.`,
    `Topic growth: ${fmt(round2(clamp01(growth)))} ` +
      `= ${fmt(points(PRIORITY_WEIGHTS.topicGrowth, clamp01(growth)))} pts.`,
  ].join(' ')

  return { score, components, reasoning }
}
