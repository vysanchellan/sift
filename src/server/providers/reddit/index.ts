import { XMLParser } from 'fast-xml-parser'

import type { Source } from '@/types'

import type { NormalizedDiscussion, SourceFetchOptions, SourceProvider } from '@/server/providers'

/**
 * Reddit source provider backed by each subreddit's public Atom feed
 * (https://www.reddit.com/r/<sub>/.rss).
 *
 * - No OAuth, no API key, no app registration: the feed is public.
 * - The feed exposes titles, permalinks, authors, timestamps and the post
 *   body HTML only. It does NOT expose scores, comment counts or vote ratios,
 *   so `normalizeItem()` stores null for those (never a fabricated 0).
 * - Requests use a descriptive User-Agent (Reddit blocks unset/generic ones).
 * - Reddit throttles anonymous RSS to roughly 5 requests/minute and does NOT
 *   send a `Retry-After` header. On 429 the provider backs off exponentially
 *   (up to ~1 minute) and keeps a per-host cooldown shared by every
 *   subreddit, so a throttled feed does not force each subreddit to re-burn
 *   its own retry budget.
 */

export const REDDIT_RSS_USER_AGENT = 'sift/0.1.0 (RSS reader)'
export const REDDIT_RSS_MAX_PER_SUBREDDIT = 25
const DEFAULT_REQUEST_DELAY_MS = 2000
const DEFAULT_RETRY_BASE_MS = 2000
const MAX_RETRIES = 5

export class RedditRssError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RedditRssError'
  }
}

/** Per-source config stored in `sources.config`. */
export interface RedditRssSourceConfig {
  /** Subreddits to pull posts from (e.g. ["programming", "golang"]). */
  subreddits?: string[] | string
  /** How many of the feed's most recent posts to keep per subreddit (max 25). */
  postsPerSubreddit?: number
  /** Milliseconds to wait between per-subreddit requests (default 2000). */
  requestDelayMs?: number
  /**
   * Base milliseconds for 429 retry backoff (default 2000). Doubles on each
   * retry up to ~32s; a `Retry-After` header, if present, is honored over it.
   */
  retryBaseDelayMs?: number
}

/** One entry as parsed from the Atom feed (before provider normalization). */
export interface RedditFeedEntry {
  id?: string | number
  title?: string
  link?: string | { '@_href'?: string } | Array<string | { '@_href'?: string }>
  updated?: string
  published?: string
  author?: string | { name?: string; uri?: string }
  summary?: string
  content?: string | { '#text'?: string; '@_type'?: string }
}

/** Provider-specific raw item; consumers treat it as opaque. */
export interface RedditRawItem {
  subreddit: string
  entry: RedditFeedEntry
}

interface ParsedFeed {
  entries: RedditFeedEntry[]
  updated: string | null
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
})

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason ?? new Error('Aborted'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function retryAfterMs(response: Response): number | null {
  const value = response.headers.get('retry-after')
  if (!value) return null
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return seconds * 1000
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function toSubredditList(value: string[] | string | undefined): string[] {
  if (value == null) return []
  const list = Array.isArray(value) ? value : [value]
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const sub = String(raw)
      .trim()
      .toLowerCase()
      .replace(/^\/?r\//, '')
    if (sub && !seen.has(sub)) {
      seen.add(sub)
      out.push(sub)
    }
  }
  return out
}

function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as { feed?: { entry?: unknown; updated?: string } }
  const feed = doc.feed
  if (!feed) {
    throw new RedditRssError('Reddit responded with an unrecognized (non-Atom) body.')
  }
  const entries = feed.entry
  const list = entries == null ? [] : Array.isArray(entries) ? entries : [entries]
  return { entries: list as RedditFeedEntry[], updated: feed.updated ?? null }
}

function entryLink(link: RedditFeedEntry['link']): string | null {
  if (typeof link === 'string') return link
  if (Array.isArray(link)) {
    for (const candidate of link) {
      if (typeof candidate === 'string') return candidate
      if (typeof candidate?.['@_href'] === 'string') return candidate['@_href']
    }
    return null
  }
  if (typeof link?.['@_href'] === 'string') return link['@_href']
  return null
}

function entryContent(content: RedditFeedEntry['content']): string | null {
  const html =
    typeof content === 'string'
      ? content
      : typeof content?.['#text'] === 'string'
        ? content['#text']
        : null
  if (!html) return null
  const text = stripHtml(html)
  return text.length > 0 ? text : null
}

function entryAuthor(author: RedditFeedEntry['author']): string | null {
  if (typeof author === 'string') return author
  if (typeof author?.name === 'string') return author.name
  return null
}

/**
 * Fetches each configured subreddit's Atom feed and returns the parsed raw
 * entries (tagged with their subreddit). Subreddit-level failures (missing
 * subreddit, rate limits beyond retries) are skipped so one bad subreddit
 * does not block the rest; if nothing could be fetched at all, a
 * `RedditRssError` summarizing the failures is thrown.
 */
export class RedditRssProvider implements SourceProvider<RedditRawItem> {
  readonly kind = 'reddit'
  readonly name = 'Reddit (RSS)'

  /**
   * Per-host cooldown (epoch ms) until which requests are paused. Set on
   * every 429 and shared across all subreddits so a throttled feed does not
   * make each subreddit independently re-burn its retry budget.
   */
  private readonly cooldowns = new Map<string, number>()

  async fetchDiscussions(source: Source, options?: SourceFetchOptions): Promise<RedditRawItem[]> {
    const config = (source.config ?? {}) as RedditRssSourceConfig
    const subreddits = toSubredditList(config.subreddits)
    if (subreddits.length === 0) {
      throw new RedditRssError(
        `Source "${source.name}" has no subreddits configured. Set config.subreddits.`
      )
    }
    const maxPerSub = clamp(
      config.postsPerSubreddit ?? REDDIT_RSS_MAX_PER_SUBREDDIT,
      1,
      REDDIT_RSS_MAX_PER_SUBREDDIT
    )
    const parsedDelay = Number(config.requestDelayMs)
    const requestDelay =
      Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : DEFAULT_REQUEST_DELAY_MS
    const parsedRetry = Number(config.retryBaseDelayMs)
    const retryBase =
      Number.isFinite(parsedRetry) && parsedRetry > 0 ? parsedRetry : DEFAULT_RETRY_BASE_MS

    const items: RedditRawItem[] = []
    const failures: string[] = []

    for (let i = 0; i < subreddits.length; i++) {
      if (options?.signal?.aborted) {
        throw new RedditRssError('Reddit RSS fetch was aborted.')
      }
      const subreddit = subreddits[i]
      if (i > 0 && requestDelay > 0) await sleep(requestDelay, options?.signal)
      try {
        const { entries } = await this.fetchSubredditFeed(subreddit, retryBase, options)
        items.push(...entries.slice(0, maxPerSub).map((entry) => ({ subreddit, entry })))
      } catch (error) {
        if (options?.signal?.aborted) throw error
        failures.push(`${subreddit}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (items.length === 0) {
      throw new RedditRssError(
        failures.length > 0
          ? `No posts could be fetched. ${failures.join('; ')}`
          : `No posts in the feed for source "${source.name}".`
      )
    }
    return items
  }

  normalizeItem(raw: RedditRawItem): NormalizedDiscussion {
    const { subreddit, entry } = raw
    const externalId = String(entry.id ?? '')
    const publishedAt = entry.published ?? entry.updated ?? null
    const author =
      entryAuthor(entry.author)
        ?.trim()
        .replace(/^\/u\//, '')
        .trim() || null
    const summary = typeof entry.summary === 'string' ? stripHtml(entry.summary) : ''
    const body = entryContent(entry.content) ?? (summary.length > 0 ? summary : null)

    return {
      externalId,
      title: entry.title ?? '',
      body,
      author,
      url: entryLink(entry.link),
      publishedAt,
      numComments: null,
      score: null,
      upvoteRatio: null,
      tags: [],
      metadata: {
        provider: 'reddit',
        feed: 'rss',
        subreddit,
        redditFeed: {
          id: externalId,
          subreddit,
          publishedAt,
          updatedAt: entry.updated ?? null,
        },
      },
      subreddit,
    }
  }

  private async waitForCooldown(host: string, signal?: AbortSignal): Promise<void> {
    const until = this.cooldowns.get(host) ?? 0
    const remaining = until - Date.now()
    if (remaining > 0) await sleep(remaining, signal)
  }

  private async fetchSubredditFeed(
    subreddit: string,
    retryBase: number,
    options?: SourceFetchOptions
  ): Promise<ParsedFeed> {
    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/.rss`
    const host = new URL(url).host

    let attempt = 0
    for (;;) {
      await this.waitForCooldown(host, options?.signal)

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'User-Agent': REDDIT_RSS_USER_AGENT,
          Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml',
        },
        signal: options?.signal,
      })

      if (response.status === 200) {
        return parseFeed(await response.text())
      }

      if (response.status === 429 && attempt < MAX_RETRIES) {
        attempt++
        const backoff = retryBase * 2 ** attempt
        const delay = Math.max(backoff, retryAfterMs(response) ?? 0)
        this.cooldowns.set(host, Date.now() + delay)
        await sleep(delay, options?.signal)
        continue
      }

      throw new RedditRssError(
        response.status === 404
          ? `subreddit r/${subreddit} was not found`
          : `Reddit RSS request for r/${subreddit} failed with status ${response.status}`
      )
    }
  }
}
