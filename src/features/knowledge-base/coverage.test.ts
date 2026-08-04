import { describe, expect, it } from 'vitest'

import {
  classifyCoverage,
  COVERAGE_ANSWERED,
  COVERAGE_GAP,
  COVERAGE_PARTIALLY_COVERED,
} from './coverage'

describe('classifyCoverage', () => {
  it('classifies a strong match as answered', () => {
    expect(classifyCoverage(0.9)).toEqual({ status: COVERAGE_ANSWERED, bestSimilarity: 0.9 })
  })

  it('classifies exactly at the answered threshold as answered', () => {
    expect(classifyCoverage(0.55).status).toBe(COVERAGE_ANSWERED)
  })

  it('classifies a mid match as partially covered', () => {
    expect(classifyCoverage(0.4)).toEqual({
      status: COVERAGE_PARTIALLY_COVERED,
      bestSimilarity: 0.4,
    })
  })

  it('classifies exactly at the partially covered threshold as partially covered', () => {
    expect(classifyCoverage(0.3).status).toBe(COVERAGE_PARTIALLY_COVERED)
  })

  it('classifies a weak match as a gap', () => {
    expect(classifyCoverage(0.1).status).toBe(COVERAGE_GAP)
  })

  it('treats a null similarity as a gap with no similarity', () => {
    expect(classifyCoverage(null)).toEqual({ status: COVERAGE_GAP, bestSimilarity: null })
    expect(classifyCoverage(undefined)).toEqual({ status: COVERAGE_GAP, bestSimilarity: null })
  })

  it('treats a non-finite similarity as a gap', () => {
    expect(classifyCoverage(NaN).status).toBe(COVERAGE_GAP)
    expect(classifyCoverage(Infinity).status).toBe(COVERAGE_GAP)
  })

  it('clamps out-of-range similarities into [0, 1]', () => {
    expect(classifyCoverage(-0.5).status).toBe(COVERAGE_GAP)
    expect(classifyCoverage(1.5)).toEqual({ status: COVERAGE_ANSWERED, bestSimilarity: 1 })
  })

  it('respects custom thresholds', () => {
    const strict = { answered: 0.8, partiallyCovered: 0.5 }
    expect(classifyCoverage(0.6, strict).status).toBe(COVERAGE_PARTIALLY_COVERED)
    expect(classifyCoverage(0.9, strict).status).toBe(COVERAGE_ANSWERED)
  })
})
