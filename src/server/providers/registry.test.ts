import { afterEach, describe, expect, it } from 'vitest'

import type { Source } from '@/types'

import type { AIProvider } from './ai'
import type { SourceProvider } from './sources'
import {
  ProviderError,
  getAIProvider,
  getSourceProvider,
  hasAIProvider,
  hasSourceProvider,
  registerAIProvider,
  registerSourceProvider,
  registeredAIProviders,
  registeredSourceProviders,
  unregisterAIProvider,
  unregisterSourceProvider,
} from './registry'

function createSource(kind: string): Source {
  return {
    id: `src-${kind}`,
    user_id: 'user-1',
    kind,
    name: `Source ${kind}`,
    config: {},
    is_enabled: true,
    status: 'active',
    external_id: null,
    last_synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function createSourceProvider(kind: string, title: string): SourceProvider {
  return {
    kind,
    name: `Mock ${kind}`,
    async fetchDiscussions(source) {
      return [{ id: `${source.kind}-1`, title }]
    },
    normalizeItem(raw) {
      const item = raw as { id: string; title: string }
      return {
        externalId: item.id,
        title: item.title,
        body: null,
        author: null,
        url: null,
        publishedAt: null,
        numComments: null,
        score: null,
        upvoteRatio: null,
        tags: [],
        metadata: {},
        subreddit: null,
      }
    },
  }
}

function createAIProvider(name: string, prefix: string): AIProvider {
  return {
    name,
    async summarize(text) {
      return { summary: `${prefix} summary of ${text}` }
    },
    async extractKeywords() {
      return [`${prefix}-keyword`]
    },
    async embed() {
      return { embedding: [1, 2, 3], model: 'mock-model', dimensions: 3 }
    },
    async classify() {
      return { label: `${prefix}-label`, confidence: 0.9 }
    },
  }
}

afterEach(() => {
  delete process.env.SOURCE_PROVIDER
  delete process.env.AI_PROVIDER
  for (const key of registeredSourceProviders()) unregisterSourceProvider(key)
  for (const key of registeredAIProviders()) unregisterAIProvider(key)
})

describe('getSourceProvider', () => {
  it('selects the active provider from the SOURCE_PROVIDER env var', async () => {
    registerSourceProvider(createSourceProvider('reddit', 'Reddit title'))
    registerSourceProvider(createSourceProvider('bluesky', 'Bluesky title'))

    process.env.SOURCE_PROVIDER = 'reddit'
    const reddit = await getSourceProvider().fetchDiscussions(createSource('reddit'))
    expect(getSourceProvider().kind).toBe('reddit')
    expect(reddit).toHaveLength(1)

    process.env.SOURCE_PROVIDER = 'bluesky'
    expect(getSourceProvider().kind).toBe('bluesky')
    expect(getSourceProvider().name).toBe('Mock bluesky')
  })

  it('swaps a mock provider without touching calling code', async () => {
    const consume = async () => {
      const provider = getSourceProvider('reddit')
      const raw = await provider.fetchDiscussions(createSource('reddit'))
      return raw.map((item) => provider.normalizeItem(item).title)
    }

    registerSourceProvider(createSourceProvider('reddit', 'original title'))
    expect(await consume()).toEqual(['original title'])

    unregisterSourceProvider('reddit')
    registerSourceProvider(createSourceProvider('reddit', 'swapped title'))
    expect(await consume()).toEqual(['swapped title'])
  })

  it('keys registration by provider.kind when no kind is given', () => {
    registerSourceProvider(createSourceProvider('hackernews', 'HN title'))
    expect(hasSourceProvider('hackernews')).toBe(true)
    expect(getSourceProvider('hackernews').kind).toBe('hackernews')
  })

  it('lets callers select a provider explicitly, bypassing env config', () => {
    registerSourceProvider(createSourceProvider('reddit', 'Reddit title'))
    registerSourceProvider(createSourceProvider('bluesky', 'Bluesky title'))
    process.env.SOURCE_PROVIDER = 'bluesky'

    expect(getSourceProvider('reddit').kind).toBe('reddit')
    expect(getSourceProvider().kind).toBe('bluesky')
  })

  it('throws when SOURCE_PROVIDER is unset and no id is given', () => {
    expect(() => getSourceProvider()).toThrow(ProviderError)
    expect(() => getSourceProvider()).toThrow(/SOURCE_PROVIDER is not set/)
  })

  it('throws when the env-selected provider is not registered', () => {
    process.env.SOURCE_PROVIDER = 'does-not-exist'
    expect(() => getSourceProvider()).toThrow(ProviderError)
    expect(() => getSourceProvider()).toThrow(/No source provider registered for "does-not-exist"/)
  })
})

describe('getAIProvider', () => {
  it('selects the active provider from the AI_PROVIDER env var', async () => {
    registerAIProvider(createAIProvider('gemini', 'g'))
    registerAIProvider(createAIProvider('openai', 'o'))

    process.env.AI_PROVIDER = 'gemini'
    expect(getAIProvider().name).toBe('gemini')
    expect((await getAIProvider().summarize('hello')).summary).toBe('g summary of hello')

    process.env.AI_PROVIDER = 'openai'
    expect(getAIProvider().name).toBe('openai')
    expect((await getAIProvider().summarize('hello')).summary).toBe('o summary of hello')
  })

  it('swaps a mock provider without touching calling code', async () => {
    const consume = async () => (await getAIProvider('gemini').summarize('hello')).summary

    registerAIProvider(createAIProvider('gemini', 'g1'))
    expect(await consume()).toBe('g1 summary of hello')

    unregisterAIProvider('gemini')
    registerAIProvider(createAIProvider('gemini', 'g2'))
    expect(await consume()).toBe('g2 summary of hello')
  })

  it('throws when the env-selected provider is not registered', () => {
    process.env.AI_PROVIDER = 'does-not-exist'
    expect(() => getAIProvider()).toThrow(ProviderError)
    expect(() => getAIProvider()).toThrow(/No AI provider registered for "does-not-exist"/)
  })
})

describe('registry bookkeeping', () => {
  it('tracks registered providers and reports keys', () => {
    registerSourceProvider(createSourceProvider('reddit', 'x'))
    registerAIProvider(createAIProvider('gemini', 'g'))

    expect(registeredSourceProviders()).toContain('reddit')
    expect(registeredAIProviders()).toContain('gemini')
    expect(hasSourceProvider('reddit')).toBe(true)
    expect(hasAIProvider('gemini')).toBe(true)

    expect(unregisterSourceProvider('reddit')).toBe(true)
    expect(hasSourceProvider('reddit')).toBe(false)
    expect(unregisterSourceProvider('reddit')).toBe(false)
  })

  it('runs calling code that only sees the interface and the registry', async () => {
    const summarizeThroughRegistry = async (name: string) => {
      const provider = getAIProvider(name)
      return provider.summarize('input')
    }

    registerAIProvider(createAIProvider('gemini', 'g'))
    const result = await summarizeThroughRegistry('gemini')
    expect(result.summary).toBe('g summary of input')
  })
})
