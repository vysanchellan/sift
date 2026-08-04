import { describe, expect, it } from 'vitest'

import {
  computePriority,
  ENGAGEMENT_HALF_POINT,
  NEUTRAL_TOPIC_GROWTH,
  PRIORITY_WEIGHTS,
  VISIBILITY_HALF_POINT,
} from './priority'

function signal(label: string, confidence = 1) {
  return { label, confidence }
}

const signals = {
  intent: signal('high'),
  urgency: signal('high'),
  competition: signal('low'),
}

// Hand-computed reference:
//   weighted = 0.30*buyingIntent + 0.20*urgency + 0.15*(1-competition)
//            + 0.10*visibility + 0.10*engagement + 0.15*topicGrowth
//   score    = round(weighted * 100)
//   visibility = score/(score+VISIBILITY_HALF_POINT)
//   engagement = comments/(comments+ENGAGEMENT_HALF_POINT)

describe('computePriority', () => {
  it('scores a strong opportunity high', () => {
    // high intent(1) + high urgency(1) + low competition(->1)
    // + 100 upvotes -> 0.5 + 20 comments -> 0.5 + growth 1
    // = 0.30 + 0.20 + 0.15 + 0.05 + 0.05 + 0.15 = 0.90 -> 90
    const result = computePriority({
      signals,
      metrics: { score: 100, numComments: 20 },
      topicGrowth: 1,
    })
    expect(result.score).toBe(90)
    expect(result.components.buyingIntent).toBe(1)
    expect(result.components.urgency).toBe(1)
    expect(result.components.competition).toBe(1)
    expect(result.components.visibility).toBeCloseTo(100 / (100 + VISIBILITY_HALF_POINT))
    expect(result.components.engagement).toBeCloseTo(20 / (20 + ENGAGEMENT_HALF_POINT))
    expect(result.components.topicGrowth).toBe(1)
  })

  it('returns neutral 0.4 for all-medium signals and missing metrics', () => {
    // medium intent(0.5) + medium urgency(0.5) + medium competition(->0.5)
    // + no score/comments (0) + neutral growth (0.5)
    // = 0.15 + 0.10 + 0.075 + 0 + 0 + 0.075 = 0.40 -> 40
    const result = computePriority({
      signals: {
        intent: signal('medium'),
        urgency: signal('medium'),
        competition: signal('medium'),
      },
      metrics: { score: null, numComments: null },
    })
    expect(result.score).toBe(40)
    expect(result.components.visibility).toBe(0)
    expect(result.components.engagement).toBe(0)
    expect(result.components.topicGrowth).toBe(NEUTRAL_TOPIC_GROWTH)
  })

  it('scores the worst case at 0', () => {
    // low intent(0) + low urgency(0) + high competition(->0)
    // + no score/comments (0) + growth 0
    // = 0 -> 0
    const result = computePriority({
      signals: {
        intent: signal('low'),
        urgency: signal('low'),
        competition: signal('high'),
      },
      metrics: { score: 0, numComments: 0 },
      topicGrowth: 0,
    })
    expect(result.score).toBe(0)
    expect(result.components.buyingIntent).toBe(0)
    expect(result.components.competition).toBe(0)
  })

  it('regresses signal values toward neutral when confidence is low', () => {
    // high intent with conf 0.5 -> 1*0.5 + 0.5*0.5 = 0.75
    // low urgency(0) + low competition(->1) + score 100(0.5) + comments 20(0.5) + growth 1
    // = 0.30*0.75 + 0.20*0 + 0.15*1 + 0.05 + 0.05 + 0.15 = 0.625 -> 63
    const result = computePriority({
      signals: {
        intent: signal('high', 0.5),
        urgency: signal('low', 1),
        competition: signal('low', 1),
      },
      metrics: { score: 100, numComments: 20 },
      topicGrowth: 1,
    })
    expect(result.components.buyingIntent).toBeCloseTo(0.75)
    expect(result.score).toBe(63)
  })

  it('scales visibility and engagement logistically', () => {
    // high intent + medium urgency(0.5) + low competition
    // + 300 upvotes -> 0.75 + 60 comments -> 0.75 + growth 0.8
    // = 0.30 + 0.10 + 0.15 + 0.075 + 0.075 + 0.12 = 0.82 -> 82
    const result = computePriority({
      signals: { intent: signal('high'), urgency: signal('medium'), competition: signal('low') },
      metrics: { score: 300, numComments: 60 },
      topicGrowth: 0.8,
    })
    expect(result.score).toBe(82)
    expect(result.components.visibility).toBeCloseTo(0.75)
    expect(result.components.engagement).toBeCloseTo(0.75)
  })

  it('keeps the score within 0..100 bounds', () => {
    const max = computePriority({
      signals,
      metrics: { score: 1_000_000, numComments: 1_000_000 },
      topicGrowth: 1,
    })
    expect(max.score).toBeLessThanOrEqual(100)
    const min = computePriority({
      signals: {
        intent: signal('low'),
        urgency: signal('low'),
        competition: signal('high'),
      },
      metrics: { score: -5, numComments: -3 },
      topicGrowth: -1,
    })
    expect(min.score).toBeGreaterThanOrEqual(0)
  })

  it('produces a human-readable reasoning string with the "why"', () => {
    const result = computePriority({
      signals,
      metrics: { score: 100, numComments: 20 },
      topicGrowth: 1,
    })
    expect(result.reasoning).toContain('Priority 90/100')
    expect(result.reasoning).toContain('Buying intent: high')
    expect(result.reasoning).toContain('Urgency: high')
    expect(result.reasoning).toContain('Competition: low')
    expect(result.reasoning).toContain('Visibility: 100 upvotes')
    expect(result.reasoning).toContain('Engagement: 20 comments')
    expect(result.reasoning).toContain('Topic growth: 1.0')
    expect(result.reasoning).toContain('pts')
  })

  it('weights sum to 1 so the score is a true weighted blend', () => {
    const total = Object.values(PRIORITY_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1)
  })
})
