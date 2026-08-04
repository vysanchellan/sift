import { describe, expect, it, vi } from 'vitest'

import type { AIProvider } from '@/server/providers'
import type { Discussion } from '@/types'

import {
  buildDiscussionText,
  combineSignals,
  enrichOne,
  ENRICHMENT_TEXT_MAX_CHARS,
  signalValue,
  SIGNAL_LABELS,
  TOPIC_LABELS,
  type EnrichmentSignals,
} from './enrich'

function createDiscussion(overrides: Partial<Discussion> = {}): Discussion {
  return {
    id: 'disc-1',
    user_id: 'user-1',
    source_id: 'src-1',
    external_id: 't3_1',
    title: 'A Go concurrency question',
    body: 'How do goroutines and channels work together for fan-out?',
    author: 'someone',
    score: null,
    num_comments: null,
    upvote_ratio: null,
    url: 'https://reddit.com/r/golang/comments/1/',
    published_at: null,
    fetched_at: new Date().toISOString(),
    tags: [],
    metadata: {},
    subreddit: 'golang',
    summary: null,
    keywords: [],
    category: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockProvider(): AIProvider & { classify: ReturnType<typeof vi.fn> } {
  return {
    name: 'mock',
    summarize: vi.fn().mockResolvedValue({ summary: 'A short summary of the post.' }),
    extractKeywords: vi.fn().mockResolvedValue(['go', 'concurrency', 'channels']),
    classify: vi.fn().mockImplementation(async (_text: string, labels: string[]) => {
      return { label: labels[0], confidence: 0.9, rationale: 'Reasoning.' }
    }),
    embed: vi
      .fn()
      .mockResolvedValue({ embedding: [0.1, 0.2, 0.3], model: 'mock-embed', dimensions: 3 }),
  }
}

describe('buildDiscussionText', () => {
  it('joins title and body', () => {
    const text = buildDiscussionText(createDiscussion())
    expect(text).toContain('A Go concurrency question')
    expect(text).toContain('goroutines and channels')
  })

  it('uses only the body when there is no title', () => {
    expect(buildDiscussionText({ title: '', body: 'just the body' })).toBe('just the body')
  })

  it('truncates very long discussions', () => {
    const long = buildDiscussionText({
      title: 'x',
      body: 'y'.repeat(ENRICHMENT_TEXT_MAX_CHARS + 100),
    })
    expect(long.length).toBeLessThanOrEqual(ENRICHMENT_TEXT_MAX_CHARS)
  })
})

describe('signalValue', () => {
  it('maps labels to numeric values', () => {
    expect(signalValue({ label: 'high', confidence: 0.9 })).toBe(1)
    expect(signalValue({ label: 'medium', confidence: 0.9 })).toBe(0.5)
    expect(signalValue({ label: 'low', confidence: 0.9 })).toBe(0)
  })

  it('falls back to confidence for unknown labels', () => {
    expect(signalValue({ label: 'unknown', confidence: 0.4 })).toBe(0.4)
  })
})

describe('combineSignals', () => {
  it('weights intent and urgency positively and competition negatively', () => {
    const signals: EnrichmentSignals = {
      intent: { label: 'high', confidence: 1 },
      urgency: { label: 'high', confidence: 1 },
      competition: { label: 'high', confidence: 1 },
    }
    // 0.5*1 + 0.3*1 + 0.2*(1-1) = 0.8
    expect(combineSignals(signals).score).toBe(0.8)
  })

  it('produces a higher score when competition is low', () => {
    const high: EnrichmentSignals = {
      intent: { label: 'high', confidence: 1 },
      urgency: { label: 'medium', confidence: 1 },
      competition: { label: 'low', confidence: 1 },
    }
    const low: EnrichmentSignals = {
      intent: { label: 'high', confidence: 1 },
      urgency: { label: 'medium', confidence: 1 },
      competition: { label: 'high', confidence: 1 },
    }
    expect(combineSignals(high).score).toBeGreaterThan(combineSignals(low).score)
  })

  it('averages confidence across the signals', () => {
    const signals: EnrichmentSignals = {
      intent: { label: 'medium', confidence: 0.8 },
      urgency: { label: 'medium', confidence: 0.6 },
      competition: { label: 'medium', confidence: 1.0 },
    }
    expect(combineSignals(signals).confidence).toBe(0.8)
  })
})

describe('enrichOne', () => {
  it('runs every provider step and builds the enrichment result', async () => {
    const provider = createMockProvider()
    const enriched = await enrichOne(createDiscussion(), provider)

    expect(provider.summarize).toHaveBeenCalledTimes(1)
    expect(provider.extractKeywords).toHaveBeenCalledTimes(1)
    expect(provider.embed).toHaveBeenCalledTimes(1)
    // 1 topic classify + 3 signal classifies
    expect(provider.classify).toHaveBeenCalledTimes(4)

    expect(enriched.discussionId).toBe('disc-1')
    expect(enriched.userId).toBe('user-1')
    expect(enriched.summary).toBe('A short summary of the post.')
    expect(enriched.keywords).toEqual(['go', 'concurrency', 'channels'])
    expect(enriched.category).toBe(TOPIC_LABELS[0])
    expect(enriched.signals.intent.label).toBe(SIGNAL_LABELS[0])
    expect(enriched.signals.urgency.label).toBe(SIGNAL_LABELS[0])
    expect(enriched.signals.competition.label).toBe(SIGNAL_LABELS[0])
    expect(enriched.embedding).toEqual([0.1, 0.2, 0.3])
    expect(enriched.embeddingModel).toBe('mock-embed')
  })

  it('computes a deterministic score from mock signals', async () => {
    const provider = createMockProvider()
    const enriched = await enrichOne(createDiscussion(), provider)
    // all signals high => 0.5 + 0.3 + 0 = 0.8; confidence avg = 0.9
    expect(enriched.score).toBe(0.8)
    expect(enriched.confidence).toBe(0.9)
  })

  it('propagates provider failures so the discussion stays pending', async () => {
    const provider = createMockProvider()
    provider.summarize = vi.fn().mockRejectedValue(new Error('rate limited'))
    await expect(enrichOne(createDiscussion(), provider)).rejects.toThrow('rate limited')
  })
})
