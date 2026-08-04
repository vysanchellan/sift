import { describe, expect, it } from 'vitest'

import { computeTrend, detectTrends, type TrendResult } from './trends'

// Hand-computed reference for computeTrend:
//   volumeChange   = (current.volume - previous.volume) / previous.volume (or 1 if prev=0)
//   engagementChange = same formula on engagement
//   direction = rising if both >= 0.25, falling if both <= -0.2, else steady
//   score = clamp01( (v+e)/2 / (1 + (v+e)/2) ) when growth positive, else 0

describe('computeTrend', () => {
  it('flags a topic with rising volume and engagement as rising', () => {
    // previous {volume: 10, engagement: 50}, current {volume: 15, engagement: 80}
    // volumeChange = 0.5, engagementChange = 0.6 -> both >= 0.25 -> rising
    // growth = 0.55, score = 0.55 / 1.55 = 0.3548...
    const trend = computeTrend({
      topic: 'concurrency',
      previous: { volume: 10, engagement: 50 },
      current: { volume: 15, engagement: 80 },
    })
    expect(trend.direction).toBe('rising')
    expect(trend.volumeChange).toBeCloseTo(0.5)
    expect(trend.engagementChange).toBeCloseTo(0.6)
    expect(trend.score).toBeCloseTo(0.55 / 1.55)
    expect(trend.reasoning).toContain('rising')
  })

  it('flags a shrinking topic as falling', () => {
    // volume 20 -> 10 (change -0.5), engagement 100 -> 60 (change -0.4)
    // both <= -0.2 -> falling; score clamps to 0
    const trend = computeTrend({
      topic: 'hot-take',
      previous: { volume: 20, engagement: 100 },
      current: { volume: 10, engagement: 60 },
    })
    expect(trend.direction).toBe('falling')
    expect(trend.volumeChange).toBeCloseTo(-0.5)
    expect(trend.engagementChange).toBeCloseTo(-0.4)
    expect(trend.score).toBe(0)
  })

  it('keeps flat topics steady', () => {
    // equal windows -> 0 change -> steady, score 0
    const trend = computeTrend({
      topic: 'steady-topic',
      previous: { volume: 8, engagement: 40 },
      current: { volume: 8, engagement: 40 },
    })
    expect(trend.direction).toBe('steady')
    expect(trend.score).toBe(0)
  })

  it('handles zero previous volume (new topic) as +100% growth', () => {
    // previous 0 -> relativeChange returns 1 (growth from nothing)
    // current volume 5, engagement 20 (prev 0 -> engagement change 1)
    const trend = computeTrend({
      topic: 'brand-new',
      previous: { volume: 0, engagement: 0 },
      current: { volume: 5, engagement: 20 },
    })
    expect(trend.direction).toBe('rising')
    expect(trend.volumeChange).toBe(1)
    expect(trend.engagementChange).toBe(1)
    expect(trend.score).toBeCloseTo(1 / 2)
  })

  it('handles zero current volume', () => {
    // topic disappeared entirely
    const trend = computeTrend({
      topic: 'dead-topic',
      previous: { volume: 6, engagement: 30 },
      current: { volume: 0, engagement: 0 },
    })
    expect(trend.direction).toBe('falling')
    expect(trend.volumeChange).toBeCloseTo(-1)
    expect(trend.engagementChange).toBeCloseTo(-1)
  })
})

describe('detectTrends', () => {
  const now = new Date('2026-08-04T12:00:00Z')
  const days = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

  const discussion = (
    published_at: Date,
    keywords: string[],
    num_comments: number | null = null
  ) => ({
    published_at: published_at.toISOString(),
    keywords,
    num_comments,
    score: null as number | null,
  })

  it('aggregates topics across previous and current windows', () => {
    const trends = detectTrends(
      [
        // previous window (10-14 days ago): 1 "go" post, 5 comments
        discussion(days(12), ['go'], 5),
        // current window (0-7 days ago): 3 "go" posts, 15 comments
        discussion(days(3), ['go'], 5),
        discussion(days(2), ['go'], 5),
        discussion(days(1), ['go'], 5),
        // unrelated topic, previous window only
        discussion(days(13), ['rust'], 9),
      ],
      { now, windowDays: 7 }
    )

    const go = trends.find((t) => t.topic === 'go')!
    expect(go).toBeDefined()
    expect(go.previous).toEqual({ volume: 1, engagement: 5 })
    expect(go.current).toEqual({ volume: 3, engagement: 15 })
    expect(go.direction).toBe('rising')
  })

  it('computes direction and score for an aggregate', () => {
    const trends = detectTrends(
      [
        discussion(days(10), ['web'], 2),
        discussion(days(4), ['web'], 4),
        discussion(days(3), ['web'], 6),
      ],
      { now, windowDays: 7 }
    )
    const web = trends.find((t) => t.topic === 'web') as TrendResult
    expect(web.previous.volume).toBe(1)
    expect(web.current.volume).toBe(2)
    expect(web.direction).toBe('rising')
  })

  it('ignores discussions outside both windows', () => {
    const trends = detectTrends([discussion(days(20), ['ancient'], 1)], { now, windowDays: 7 })
    expect(trends).toHaveLength(0)
  })

  it('allows injecting an engagement metric', () => {
    const trends = detectTrends(
      [discussion(days(10), ['ml'], null), discussion(days(3), ['ml'], null)],
      {
        now,
        windowDays: 7,
        engagementOf: (d) => d.score ?? 0,
      }
    )
    const ml = trends.find((t) => t.topic === 'ml')!
    expect(ml.current.engagement).toBe(0)
    expect(ml.previous.engagement).toBe(0)
  })
})
