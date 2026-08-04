import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { GeminiAIProvider } from '@/server/providers/gemini'
import {
  getAIProvider,
  hasAIProvider,
  registerAIProvider,
  type AIProvider,
} from '@/server/providers'
import type { Discussion, Json } from '@/types'

import { enrichOne, type EnrichedDiscussion } from './enrich'

/**
 * Enrichment pipeline. Discussions that are awaiting enrichment ("queued")
 * are exactly the ones with `summary IS NULL` (the completion marker). The
 * pipeline picks up pending rows for a user and processes them in small
 * batches, pausing between batches so Gemini's free-tier rate limits are not
 * exceeded. Each enriched discussion gets:
 *   - `discussions`: summary, keywords, category
 *   - `discussion_scores`: provider/model, normalized score, confidence,
 *     per-signal breakdown (`signals`), rationale, and the embedding.
 *
 * The concrete provider is wired into the registry once per process; callers
 * only depend on the AIProvider interface.
 */

export const ENRICHMENT_VERSION = 'v1'
export const ENRICHMENT_BATCH_SIZE = 5
export const ENRICHMENT_BATCH_GAP_MS = 1500

export interface EnrichmentRunResult {
  userId: string
  considered: number
  enriched: number
  failed: number
  errors: string[]
}

function geminiProvider(): AIProvider {
  if (!hasAIProvider('gemini')) {
    registerAIProvider(new GeminiAIProvider())
  }
  return getAIProvider('gemini')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toScoreRow(enriched: EnrichedDiscussion, providerName: string) {
  return {
    user_id: enriched.userId,
    discussion_id: enriched.discussionId,
    provider: providerName,
    model: null,
    score: enriched.score,
    confidence: enriched.confidence,
    signals: {
      category: enriched.category,
      intent: enriched.signals.intent,
      urgency: enriched.signals.urgency,
      competition: enriched.signals.competition,
    } as unknown as Json,
    rationale: enriched.rationale || null,
    version: ENRICHMENT_VERSION,
    embedding: enriched.embedding as unknown as Json,
    embedding_model: enriched.embeddingModel,
  }
}

async function writeEnrichment(
  supabase: ReturnType<typeof createAdminClient>,
  enriched: EnrichedDiscussion,
  providerName: string
): Promise<void> {
  const { error: scoreError } = await supabase
    .from('discussion_scores')
    .upsert(toScoreRow(enriched, providerName), { onConflict: 'discussion_id,provider,version' })
  if (scoreError) {
    throw new Error(`Could not save scores: ${scoreError.message}`)
  }

  const { error: updateError } = await supabase
    .from('discussions')
    .update({
      summary: enriched.summary,
      keywords: enriched.keywords,
      category: enriched.category,
    })
    .eq('id', enriched.discussionId)
  if (updateError) {
    throw new Error(`Could not save enrichment: ${updateError.message}`)
  }
}

/**
 * Enriches every pending (unsummarized) discussion for a user. Pass
 * `provider` to inject a mock in tests; otherwise the Gemini provider from
 * the registry is used. Failures are isolated per discussion and reported on
 * the result; a failed discussion keeps `summary IS NULL` and is retried on
 * the next run.
 */
export async function enrichPendingDiscussions(
  userId: string,
  options: { batchSize?: number; limit?: number; provider?: AIProvider; signal?: AbortSignal } = {}
): Promise<EnrichmentRunResult> {
  const provider = options.provider ?? geminiProvider()
  const supabase = createAdminClient()
  const batchSize = Math.max(1, options.batchSize ?? ENRICHMENT_BATCH_SIZE)

  const result: EnrichmentRunResult = { userId, considered: 0, enriched: 0, failed: 0, errors: [] }

  const { data: pending, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('user_id', userId)
    .is('summary', null)

  if (error) {
    throw new Error(`Could not load pending discussions: ${error.message}`)
  }

  const discussions = (pending ?? []).slice(0, Math.max(0, options.limit ?? Infinity))
  result.considered = discussions.length

  for (let start = 0; start < discussions.length; start += batchSize) {
    const batch = discussions.slice(start, start + batchSize)
    for (const discussion of batch as Discussion[]) {
      if (options.signal?.aborted) {
        result.errors.push('Enrichment aborted.')
        return result
      }
      try {
        const enriched = await enrichOne(discussion, provider, { signal: options.signal })
        await writeEnrichment(supabase, enriched, provider.name)
        result.enriched++
      } catch (error) {
        result.failed++
        result.errors.push(
          `${discussion.id}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
    if (start + batchSize < discussions.length) {
      await sleep(ENRICHMENT_BATCH_GAP_MS)
    }
  }

  return result
}
