import type { AIProvider } from '@/server/providers'
import type { Discussion } from '@/types'

/**
 * Enrichment of a single discussion via the AI provider abstraction. This
 * module is pure orchestration (no DB, no server-only): the pipeline feeds it
 * a discussion and a provider, it returns the structured enrichment result.
 * Kept free of I/O so it can be unit-tested with a mock provider.
 */

export const TOPIC_LABELS = [
  'programming',
  'devops',
  'data',
  'web',
  'mobile',
  'career',
  'tools',
  'other',
] as const
export const SIGNAL_LABELS = ['high', 'medium', 'low'] as const

export const ENRICHMENT_TEXT_MAX_CHARS = 3000
export const ENRICHMENT_SUMMARY_WORDS = 120
export const ENRICHMENT_KEYWORDS = 8

export interface SignalScore {
  label: string
  confidence: number
  rationale?: string
}

export interface EnrichmentSignals {
  intent: SignalScore
  urgency: SignalScore
  competition: SignalScore
}

export interface EnrichedDiscussion {
  discussionId: string
  userId: string
  summary: string
  keywords: string[]
  category: string
  signals: EnrichmentSignals
  /** Normalized 0..1 opportunity score combining the signals. */
  score: number
  /** Average confidence across the three signals. */
  confidence: number
  rationale: string
  embedding: number[]
  embeddingModel: string
}

export function buildDiscussionText(discussion: Pick<Discussion, 'title' | 'body'>): string {
  const text = [discussion.title, discussion.body].filter(Boolean).join('\n\n').trim()
  return text.length > ENRICHMENT_TEXT_MAX_CHARS ? text.slice(0, ENRICHMENT_TEXT_MAX_CHARS) : text
}

const LABEL_VALUE: Record<string, number> = { high: 1, medium: 0.5, low: 0 }

export function signalValue(signal: SignalScore): number {
  return LABEL_VALUE[signal.label.toLowerCase()] ?? signal.confidence
}

export function combineSignals(signals: EnrichmentSignals): { score: number; confidence: number } {
  const rawScore =
    0.5 * signalValue(signals.intent) +
    0.3 * signalValue(signals.urgency) +
    0.2 * (1 - signalValue(signals.competition))
  const score = Math.min(1, Math.max(0, rawScore))
  const confidence =
    (signals.intent.confidence + signals.urgency.confidence + signals.competition.confidence) / 3
  const round3 = (value: number) => Math.round(value * 1000) / 1000
  return { score: round3(score), confidence: round3(confidence) }
}

/**
 * Runs one discussion through the provider (summary, keywords, topic, the
 * three signals, and an embedding). Calls are made sequentially so the
 * provider's own request pacing keeps us inside free-tier rate limits.
 */
export async function enrichOne(
  discussion: Discussion,
  provider: AIProvider,
  options: { signal?: AbortSignal; summaryWords?: number; keywords?: number } = {}
): Promise<EnrichedDiscussion> {
  const text = buildDiscussionText(discussion)
  const signal = options.signal

  const summaryResult = await provider.summarize(text, {
    maxLength: options.summaryWords ?? ENRICHMENT_SUMMARY_WORDS,
    signal,
  })
  const keywords = await provider.extractKeywords(text, {
    limit: options.keywords ?? ENRICHMENT_KEYWORDS,
    signal,
  })
  const category = await provider.classify(text, [...TOPIC_LABELS], { signal })
  const intent = await provider.classify(text, [...SIGNAL_LABELS], { signal })
  const urgency = await provider.classify(text, [...SIGNAL_LABELS], { signal })
  const competition = await provider.classify(text, [...SIGNAL_LABELS], { signal })
  const embeddingResult = await provider.embed(text, { signal })

  const signals: EnrichmentSignals = {
    intent: { label: intent.label, confidence: intent.confidence, rationale: intent.rationale },
    urgency: { label: urgency.label, confidence: urgency.confidence, rationale: urgency.rationale },
    competition: {
      label: competition.label,
      confidence: competition.confidence,
      rationale: competition.rationale,
    },
  }
  const { score, confidence } = combineSignals(signals)

  return {
    discussionId: discussion.id,
    userId: discussion.user_id,
    summary: summaryResult.summary,
    keywords,
    category: category.label,
    signals,
    score,
    confidence,
    rationale: [intent.rationale, urgency.rationale, competition.rationale]
      .filter(Boolean)
      .join(' '),
    embedding: embeddingResult.embedding,
    embeddingModel: embeddingResult.model,
  }
}
