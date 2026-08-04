import { describe, expect, it } from 'vitest'

import {
  buildRecommendations,
  type RecommendationInput,
  type RecommendationSignals,
} from './recommendations'

const highSignals: RecommendationSignals = {
  intent: { label: 'high', confidence: 0.9 },
  urgency: { label: 'high', confidence: 0.8 },
  competition: { label: 'low', confidence: 0.7 },
}

function base(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
  return {
    title: 'How do I build a Go HTTP server?',
    summary: 'A developer asks about building a Go HTTP server with proper routing.',
    keywords: ['Go', 'HTTP', 'routing', 'server'],
    category: 'programming',
    signals: highSignals,
    priorityScore: 85,
    components: {
      buyingIntent: 0.8,
      urgency: 0.7,
      competition: 0.9,
      visibility: 0.5,
      engagement: 0.6,
      topicGrowth: 0.7,
    },
    coverageStatus: 'answered',
    bestSimilarity: 0.71,
    courseMatchCount: 1,
    courseMatchTitle: 'Building HTTP servers',
    clusterSize: 0,
    clusterTitle: null,
    upvotes: 120,
    numComments: 20,
    ...overrides,
  }
}

describe('buildRecommendations.action', () => {
  it('replies when high-priority and already answerable with material', () => {
    // reply: 40 + 85*0.4 + 15 = 89  (highest, material present, urgency high)
    const result = buildRecommendations(base())
    expect(result.action.id).toBe('reply')
    expect(result.action.tone).toBe('action')
    expect(result.action.reason).toContain('Building HTTP servers')
  })

  it('creates content when it is a high-priority coverage gap and recurring', () => {
    // create: 20 + 60*0.3 + 20(gap) + 10(recurring) = 68 — winner
    const result = buildRecommendations(
      base({
        priorityScore: 60,
        coverageStatus: 'gap',
        bestSimilarity: 0.2,
        clusterSize: 3,
        clusterTitle: 'Go routing',
        courseMatchCount: 0,
        courseMatchTitle: null,
        upvotes: 5,
        numComments: 2,
      })
    )
    expect(result.action.id).toBe('create')
    expect(result.action.reason).toContain('coverage gap')
  })

  it('expands course content when already heavily mapped and low priority', () => {
    // expand: 20 + 5*8 + 30*0.2 = 66 — wins over reply 52
    const result = buildRecommendations(
      base({
        priorityScore: 30,
        coverageStatus: 'answered',
        courseMatchCount: 5,
        courseMatchTitle: 'Advanced servers',
        clusterSize: 0,
        signals: { ...highSignals, urgency: { label: 'low', confidence: 0.9 } },
      })
    )
    expect(result.action.id).toBe('expand')
  })

  it('monitors when unscored', () => {
    // effective priority 25 -> monitor: 10 + 25 = 35 > create: 20 + 7.5
    const result = buildRecommendations(
      base({
        priorityScore: null,
        signals: null,
        coverageStatus: null,
        courseMatchCount: 0,
        courseMatchTitle: null,
        clusterSize: 0,
      })
    )
    expect(result.action.id).toBe('monitor')
    expect(result.action.reason).toContain('Not yet scored')
  })

  it('monitors low-priority unscored content with nothing to match', () => {
    const result = buildRecommendations(
      base({
        priorityScore: 10,
        coverageStatus: 'gap',
        courseMatchCount: 0,
        courseMatchTitle: null,
      })
    )
    expect(result.action.id).toBe('monitor')
  })
})

describe('buildRecommendation.responseOutline', () => {
  it('produces a complete copy-pasteable outline', () => {
    const outline = buildRecommendations(base()).responseOutline
    expect(outline.length).toBeGreaterThanOrEqual(6)
    expect(outline[0]).toContain('Go HTTP server')
    expect(outline.join('\n')).toContain('Go, HTTP, routing, server')
    expect(outline.join('\n')).toContain('Building HTTP servers')
  })

  it('frames a gap as new material', () => {
    const outline = buildRecommendations(
      base({ coverageStatus: 'gap', courseMatchCount: 0, courseMatchTitle: null })
    ).responseOutline
    expect(outline.join('\n')).toContain('coverage gap')
  })
})

describe('buildRecommendation.contentIdeas', () => {
  it('surfaces blog, FAQ, course, and newsletter ideas when triggers fire', () => {
    const ideas = buildRecommendations(
      base({
        priorityScore: 60,
        coverageStatus: 'gap',
        clusterSize: 3,
        clusterTitle: 'Go routing',
        courseMatchCount: 0,
        courseMatchTitle: null,
        upvotes: 120,
        numComments: 20,
      })
    ).contentIdeas
    expect(ideas.blog?.title).toContain('Go')
    expect(ideas.faq?.title).toBe('How do I build a Go HTTP server?')
    expect(ideas.newsletter?.reason).toContain('20 comments')
    expect(ideas.course?.title).toContain('Go routing')
  })

  it('omits blog/newsletter ideas when the discussion is not yet scored', () => {
    const ideas = buildRecommendations(
      base({
        priorityScore: null,
        coverageStatus: 'gap',
        upvotes: 200,
        numComments: 50,
        clusterSize: 0,
      })
    ).contentIdeas
    expect(ideas.blog).toBeUndefined()
    expect(ideas.newsletter).toBeUndefined()
  })

  it('surfaces nothing when nothing fires', () => {
    const ideas = buildRecommendations(
      base({
        priorityScore: 30,
        coverageStatus: 'answered',
        clusterSize: 0,
        upvotes: 0,
        numComments: 0,
        courseMatchCount: 1,
      })
    ).contentIdeas
    expect(ideas.blog).toBeUndefined()
    expect(ideas.faq).toBeUndefined()
    expect(ideas.newsletter).toBeUndefined()
    expect(ideas.course).toBeUndefined()
  })
})
