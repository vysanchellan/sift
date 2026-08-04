import type { Json, Source } from '@/types'

/**
 * A discussion in the app's neutral shape, ready to be written to the
 * `discussions` table. Source providers produce this via `normalizeItem()`
 * from their provider-specific raw item; consumers never see raw items.
 */
export interface NormalizedDiscussion {
  externalId: string
  title: string
  body: string | null
  author: string | null
  url: string | null
  publishedAt: string | null
  /** null when the source does not expose a comment count (e.g. RSS). */
  numComments: number | null
  /** null when the source does not expose a score (e.g. RSS). */
  score: number | null
  upvoteRatio: number | null
  tags: string[]
  metadata: Json
  /** Community the item came from (e.g. the subreddit); null if not applicable. */
  subreddit: string | null
}

export interface SourceFetchOptions {
  limit?: number
  since?: Date
  signal?: AbortSignal
}

/**
 * A single raw item as returned by a source. Its shape is entirely
 * provider-specific - only the provider's own `normalizeItem()` may interpret
 * it. Consumers treat it as opaque.
 */
export type RawSourceItem = unknown

/**
 * Contract implemented by every content source adapter (Reddit, Bluesky, ...).
 * Consumers depend on this interface (via the provider registry), never on a
 * concrete provider class.
 */
export interface SourceProvider<TRawItem = RawSourceItem> {
  /** Stable identifier used to select this provider via env config. */
  readonly kind: string
  /** Human-readable provider name. */
  readonly name: string

  /** Fetch raw items for a configured source. */
  fetchDiscussions(source: Source, options?: SourceFetchOptions): Promise<TRawItem[]>

  /** Convert one provider-specific raw item into the neutral discussion shape. */
  normalizeItem(raw: TRawItem): NormalizedDiscussion
}
