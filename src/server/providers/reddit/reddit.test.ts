import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Json, Source } from '@/types'

import {
  RedditRssError,
  RedditRssProvider,
  REDDIT_RSS_USER_AGENT,
  type RedditFeedEntry,
  type RedditRawItem,
} from './index'

function createSource(config: Record<string, unknown>): Source {
  return {
    id: 'src-1',
    user_id: 'user-1',
    kind: 'reddit',
    name: 'Reddit source',
    config: config as Json,
    is_enabled: true,
    status: 'active',
    external_id: null,
    last_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function atomFeed(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title><updated>2026-01-01T00:00:00+00:00</updated>${entries.join('')}</feed>`
}

function entryXml(overrides: Partial<RedditFeedEntry> & { id: string }): string {
  return `<entry>
  <id>${overrides.id}</id>
  <title>${overrides.title ?? 'A post'}</title>
  <link href="${overrides.link ?? `https://www.reddit.com/r/golang/comments/${overrides.id}/slug/`}"/>
  <published>${overrides.published ?? '2026-01-02T03:04:05+00:00'}</published>
  <updated>${overrides.updated ?? '2026-01-02T03:04:05+00:00'}</updated>
  <author><name>/u/AutoModerator</name></author>
  <content type="html"><![CDATA[${overrides.content ?? '<p>Hello <b>world</b></p>'}]]></content>
  <summary>${overrides.summary ?? ''}</summary>
</entry>`
}

function okResponse(body: string) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/atom+xml; charset=UTF-8' },
  })
}

const provider = new RedditRssProvider()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDiscussions', () => {
  it('parses entries, tags them with their subreddit, and respects postsPerSubreddit', async () => {
    const xml = atomFeed([
      entryXml({ id: 't3_1', title: 'First' }),
      entryXml({ id: 't3_2', title: 'Second' }),
      entryXml({ id: 't3_3', title: 'Third' }),
    ])
    const fetchMock = vi.fn().mockResolvedValue(okResponse(xml))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({
      subreddits: ['GoLang'],
      postsPerSubreddit: 2,
      requestDelayMs: 0,
    })
    const items = await provider.fetchDiscussions(source)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.reddit.com/r/golang/.rss')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ subreddit: 'golang' })
    expect((items[0].entry as RedditFeedEntry).title).toBe('First')
  })

  it('sends a descriptive User-Agent header on every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(atomFeed([entryXml({ id: 't3_1' })])))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({ subreddits: ['golang'], requestDelayMs: 0 })
    await provider.fetchDiscussions(source)

    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('user-agent')).toBe(REDDIT_RSS_USER_AGENT)
    expect(headers.get('accept')).toContain('application/atom+xml')
  })

  it('fetches multiple subreddits sequentially', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const sub = (url.match(/\/r\/([^/]+)\//) ?? [])[1]
      return Promise.resolve(okResponse(atomFeed([entryXml({ id: `t3_${sub}` })])))
    })
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({
      subreddits: ['golang', 'rust'],
      requestDelayMs: 0,
    })
    const items = await provider.fetchDiscussions(source)

    expect(items.map((i) => i.subreddit)).toEqual(['golang', 'rust'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 with backoff, then succeeds', async () => {
    const xml = atomFeed([entryXml({ id: 't3_1' })])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(okResponse(xml))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({
      subreddits: ['golang'],
      requestDelayMs: 0,
      retryBaseDelayMs: 1,
    })
    const items = await provider.fetchDiscussions(source)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(items).toHaveLength(1)
  })

  it('honors a Retry-After header over the computed backoff', async () => {
    const xml = atomFeed([entryXml({ id: 't3_1' })])
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(okResponse(xml))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({
      subreddits: ['golang'],
      requestDelayMs: 0,
      retryBaseDelayMs: 1,
    })
    const started = Date.now()
    const items = await provider.fetchDiscussions(source)
    const elapsed = Date.now() - started

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(items).toHaveLength(1)
    expect(elapsed).toBeGreaterThanOrEqual(900)
  })

  it('shares the 429 cooldown across subreddits so a throttled feed recovers', async () => {
    const xml = atomFeed([entryXml({ id: 't3_1' })])
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('throttled')) return Promise.resolve(new Response('', { status: 429 }))
      return Promise.resolve(okResponse(xml))
    })
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({
      subreddits: ['throttled', 'golang'],
      requestDelayMs: 0,
      retryBaseDelayMs: 1,
    })
    const items = await provider.fetchDiscussions(source)

    // throttled exhausts 5 retries (6 requests), then golang waits out the
    // shared cooldown and succeeds.
    expect(items.map((i) => i.subreddit)).toEqual(['golang'])
    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  it('skips a failing subreddit but keeps the ones that succeeded', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('missing')) return Promise.resolve(new Response('', { status: 404 }))
      return Promise.resolve(okResponse(atomFeed([entryXml({ id: 't3_1' })])))
    })
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({ subreddits: ['golang', 'missing'], requestDelayMs: 0 })
    const items = await provider.fetchDiscussions(source)

    expect(items.map((i) => i.subreddit)).toEqual(['golang'])
  })

  it('throws when every subreddit fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({ subreddits: ['missing'], requestDelayMs: 0 })
    await expect(provider.fetchDiscussions(source)).rejects.toThrow(RedditRssError)
  })

  it('throws when no subreddits are configured', async () => {
    const source = createSource({})
    await expect(provider.fetchDiscussions(source)).rejects.toThrow(/no subreddits configured/i)
  })

  it('throws on non-Atom responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html><body>blocked</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({ subreddits: ['golang'], requestDelayMs: 0 })
    await expect(provider.fetchDiscussions(source)).rejects.toThrow(/non-Atom/i)
  })

  it('handles a feed with a single entry (not wrapped in an array)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(atomFeed([entryXml({ id: 't3_1' })])))
    vi.stubGlobal('fetch', fetchMock)

    const source = createSource({ subreddits: ['golang'], requestDelayMs: 0 })
    const items = await provider.fetchDiscussions(source)

    expect(items).toHaveLength(1)
    expect(items[0].entry).toMatchObject({ id: 't3_1' })
  })
})

describe('normalizeItem', () => {
  const raw: RedditRawItem = {
    subreddit: 'golang',
    entry: {
      id: 't3_1v89r30',
      title: 'Small Projects',
      link: { '@_href': 'https://www.reddit.com/r/golang/comments/1v89r30/small_projects/' },
      published: '2026-07-27T19:01:14+00:00',
      updated: '2026-07-27T19:01:14+00:00',
      author: { name: '/u/AutoModerator' },
      content: {
        '#text':
          '<div class="md"><p>This is the weekly thread.</p><!-- SC_ON --> <p>More <b>text</b>.</p></div>',
        '@_type': 'html',
      },
    },
  }

  it('maps the entry into the neutral discussion shape', () => {
    const normalized = provider.normalizeItem(raw)

    expect(normalized.externalId).toBe('t3_1v89r30')
    expect(normalized.title).toBe('Small Projects')
    expect(normalized.url).toBe('https://www.reddit.com/r/golang/comments/1v89r30/small_projects/')
    expect(normalized.author).toBe('AutoModerator')
    expect(normalized.publishedAt).toBe('2026-07-27T19:01:14+00:00')
    expect(normalized.body).toContain('This is the weekly thread.')
    expect(normalized.body).not.toContain('<p>')
    expect(normalized.body).not.toContain('SC_OFF')
    expect(normalized.subreddit).toBe('golang')
  })

  it('stores null for metrics RSS does not expose', () => {
    const normalized = provider.normalizeItem(raw)
    expect(normalized.score).toBeNull()
    expect(normalized.numComments).toBeNull()
    expect(normalized.upvoteRatio).toBeNull()
  })

  it('records the raw feed id in metadata', () => {
    const normalized = provider.normalizeItem(raw)
    expect(normalized.metadata).toEqual(
      expect.objectContaining({
        provider: 'reddit',
        feed: 'rss',
        subreddit: 'golang',
        redditFeed: expect.objectContaining({ id: 't3_1v89r30' }),
      })
    )
  })

  it('falls back to the summary when there is no content body', () => {
    const normalized = provider.normalizeItem({
      subreddit: 'golang',
      entry: { id: 't3_2', title: 'No body', summary: '<p>A short summary</p>' },
    })
    expect(normalized.body).toBe('A short summary')
  })

  it('tolerates missing optional fields', () => {
    const normalized = provider.normalizeItem({ subreddit: 'golang', entry: { id: 't3_3' } })
    expect(normalized.title).toBe('')
    expect(normalized.author).toBeNull()
    expect(normalized.url).toBeNull()
    expect(normalized.publishedAt).toBeNull()
    expect(normalized.body).toBeNull()
  })
})
