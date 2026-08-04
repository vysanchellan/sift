/**
 * Semantic coverage classification: given the best KB-chunk similarity for a
 * discussion, decide whether the knowledge base already answers it. Pure and
 * deterministic so it can be unit-tested with hand-computed thresholds.
 */

export const COVERAGE_ANSWERED = 'answered'
export const COVERAGE_PARTIALLY_COVERED = 'partially_covered'
export const COVERAGE_GAP = 'gap'

export const COVERAGE_STATUSES = [
  COVERAGE_ANSWERED,
  COVERAGE_PARTIALLY_COVERED,
  COVERAGE_GAP,
] as const

export type CoverageStatus = (typeof COVERAGE_STATUSES)[number]

export interface CoverageThresholds {
  /** Cosine similarity at or above which a discussion counts as answered. */
  answered: number
  /** Cosine similarity at or above which a discussion counts as partially covered. */
  partiallyCovered: number
}

/** Defaults tuned for 384-dim all-MiniLM-L6-v2 cosine similarities (local default). */
export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  answered: 0.55,
  partiallyCovered: 0.3,
}

export interface CoverageClassification {
  status: CoverageStatus
  bestSimilarity: number | null
}

export function classifyCoverage(
  bestSimilarity: number | null | undefined,
  thresholds: CoverageThresholds = DEFAULT_COVERAGE_THRESHOLDS
): CoverageClassification {
  if (bestSimilarity == null || !Number.isFinite(bestSimilarity)) {
    return { status: COVERAGE_GAP, bestSimilarity: null }
  }
  const sim = Math.min(1, Math.max(0, bestSimilarity))
  if (sim >= thresholds.answered) {
    return { status: COVERAGE_ANSWERED, bestSimilarity: sim }
  }
  if (sim >= thresholds.partiallyCovered) {
    return { status: COVERAGE_PARTIALLY_COVERED, bestSimilarity: sim }
  }
  return { status: COVERAGE_GAP, bestSimilarity: sim }
}
