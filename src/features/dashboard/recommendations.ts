import type { SignalScore } from '@/features/enrichment/enrich'

/**
 * Deterministic recommendations for a single discussion. Pure (no DB, no
 * server-only) so the rules can be unit-tested with hand-computed inputs.
 *
 * Everything is derived from signals that earlier prompts already computed —
 * priority components (Prompt 6), KB coverage status (Prompt 8), and course
 * matches (Prompt 9) — so the dashboard never needs a new AI call:
 *
 *   - `action`: the single best next step (reply / create / expand / monitor).
 *   - `responseOutline`: a copy-pasteable skeleton for answering in-thread.
 *   - `contentIdeas`: opportunistic blog / FAQ / newsletter / course expansion
 *     ideas, each only surfaced when its trigger fires.
 */

export interface RecommendationSignals {
  intent: SignalScore
  urgency: SignalScore
  competition: SignalScore
}

export interface RecommendationInput {
  title: string
  summary: string | null
  keywords: string[]
  category: string | null
  signals: RecommendationSignals | null
  /** 0-100 priority score (null when not yet scored). */
  priorityScore: number | null
  components: {
    buyingIntent: number
    urgency: number
    competition: number
    visibility: number
    engagement: number
    topicGrowth: number
  } | null
  /** 'answered' | 'partially_covered' | 'gap' | null. */
  coverageStatus: string | null
  bestSimilarity: number | null
  /** Number of course sections/lessons this discussion maps to. */
  courseMatchCount: number
  /** Title of the best matching course section/lesson, when one exists. */
  courseMatchTitle: string | null
  /** Size of the recurring cluster this discussion belongs to (0 = none). */
  clusterSize: number
  clusterTitle: string | null
  upvotes: number | null
  numComments: number | null
}

export type RecommendationActionId = 'reply' | 'create' | 'expand' | 'monitor'

export type RecommendationActionTone = 'action' | 'create' | 'expand' | 'watch'

export interface RecommendationAction {
  id: RecommendationActionId
  label: string
  reason: string
  tone: RecommendationActionTone
}

export interface ContentIdea {
  title: string
  reason: string
}

export interface ContentIdeas {
  blog?: ContentIdea
  faq?: ContentIdea
  newsletter?: ContentIdea
  course?: ContentIdea
}

export interface Recommendations {
  action: RecommendationAction
  responseOutline: string[]
  contentIdeas: ContentIdeas
}

/** Priority at which a coverage gap becomes a content-creation opportunity. */
export const CREATE_CONTENT_MIN_PRIORITY = 45
/** Cluster size at which a topic counts as recurring. */
export const RECURRING_MIN_CLUSTER_SIZE = 2
/** Engagement (comments weighted above upvotes) at which a topic is newsletter-worthy. */
export const NEWSLETTER_MIN_ENGAGEMENT = 30
/** Default priority used when no score has been computed yet. */
export const DEFAULT_PRIORITY = 50

const ACTION_LABELS: Record<RecommendationActionId, string> = {
  reply: 'Answer in the thread',
  create: 'Create answer content',
  expand: 'Expand course content',
  monitor: 'Monitor',
}

const ACTION_TONES: Record<RecommendationActionId, RecommendationActionTone> = {
  reply: 'action',
  create: 'create',
  expand: 'expand',
  monitor: 'watch',
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`
}

function hasMaterial(input: RecommendationInput): boolean {
  return (
    input.coverageStatus === 'answered' ||
    input.coverageStatus === 'partially_covered' ||
    input.courseMatchCount > 0
  )
}

function engagement(input: RecommendationInput): number {
  return (input.upvotes ?? 0) + (input.numComments ?? 0) * 3
}

interface ActionCandidate {
  id: RecommendationActionId
  score: number
}

function pickAction(input: RecommendationInput): RecommendationActionId {
  // Unscored discussions are treated as low priority so they default to
  // monitoring instead of being recommended as content to create or reply to.
  const priority = input.priorityScore ?? 25
  const gap = input.coverageStatus === 'gap' && priority >= CREATE_CONTENT_MIN_PRIORITY
  const urgencyHigh = input.signals?.urgency.label.toLowerCase() === 'high'
  const recurring = input.clusterSize >= RECURRING_MIN_CLUSTER_SIZE

  const candidates: ActionCandidate[] = []

  if (hasMaterial(input)) {
    candidates.push({
      id: 'reply',
      score: 40 + priority * 0.4 + (urgencyHigh ? 15 : 0),
    })
  }

  candidates.push({
    id: 'create',
    score: 20 + priority * 0.3 + (gap ? 20 : 0) + (recurring ? 10 : 0),
  })

  if (input.courseMatchCount > 0 || input.courseMatchTitle) {
    candidates.push({
      id: 'expand',
      score: 20 + input.courseMatchCount * 8 + priority * 0.2 + (recurring ? 5 : 0),
    })
  }

  candidates.push({ id: 'monitor', score: 10 + (priority < 40 ? 25 : 0) })

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].id
}

function buildAction(input: RecommendationInput, id: RecommendationActionId): RecommendationAction {
  const priority = input.priorityScore ?? DEFAULT_PRIORITY

  let reason: string
  switch (id) {
    case 'reply': {
      const source =
        input.courseMatchCount > 0 && input.courseMatchTitle
          ? `course material ("${input.courseMatchTitle}")`
          : 'your knowledge base'
      const urgency = input.signals?.urgency.label.toLowerCase() ?? 'unknown'
      reason = `Priority ${priority}/100 with ${urgency} urgency. You already have material (${source}) that answers this — respond while the thread is active.`
      break
    }
    case 'create': {
      const gapNote =
        input.coverageStatus === 'gap' ? 'A coverage gap in your knowledge base. ' : ''
      reason = `${gapNote}Priority ${priority}/100. Produce content to own this question before competitors do.`
      break
    }
    case 'expand': {
      reason = `This discussion already maps to course content${
        input.courseMatchTitle ? ` ("${input.courseMatchTitle}")` : ''
      }. Turn the match into a lesson or deepen the existing section.`
      break
    }
    default: {
      reason =
        input.priorityScore == null
          ? 'Not yet scored. Run the enrichment pipeline, then review for rising engagement or follow-ups.'
          : `Priority ${priority}/100 is below the action threshold. Watch for rising engagement or related follow-ups.`
    }
  }

  return { id, label: ACTION_LABELS[id], reason, tone: ACTION_TONES[id] }
}

function buildResponseOutline(input: RecommendationInput): string[] {
  const outline: string[] = []

  const opener = truncate(input.summary ?? input.title, 140)
  outline.push(`Acknowledge the question directly: "${opener}".`)

  if (hasMaterial(input)) {
    const sim =
      input.bestSimilarity != null ? ` (${Math.round(input.bestSimilarity * 100)}% similar)` : ''
    outline.push(
      `Lead with the concrete answer your existing material supports${sim} — no need to improvise.`
    )
  } else {
    outline.push(
      'Frame your answer as fresh material, since this is currently a coverage gap in your knowledge base.'
    )
  }

  const topics = input.keywords.slice(0, 4)
  if (topics.length > 0) {
    outline.push(`Anchor the reply around the key topics: ${topics.join(', ')}.`)
  }
  if (input.courseMatchTitle) {
    outline.push(`Point readers to "${input.courseMatchTitle}" for the deeper material.`)
  }
  outline.push('Give one clear recommendation first, then the "why" in a single sentence.')
  outline.push('Add a short concrete example or data point to build credibility.')
  outline.push('Close with a follow-up question to keep the conversation going.')

  return outline
}

function firstTopic(input: RecommendationInput): string {
  const keyword = input.keywords[0]
  if (keyword) return keyword
  const fromTitle = input.title
    .replace(/[?!.]+$/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
  return fromTitle || 'this topic'
}

function buildContentIdeas(input: RecommendationInput): ContentIdeas {
  const ideas: ContentIdeas = {}
  const priority = input.priorityScore
  const recurring = input.clusterSize >= RECURRING_MIN_CLUSTER_SIZE
  const topic = firstTopic(input)

  if (
    input.coverageStatus === 'gap' &&
    priority != null &&
    priority >= CREATE_CONTENT_MIN_PRIORITY
  ) {
    ideas.blog = {
      title: `A practical guide to ${topic}`,
      reason: `A ${priority}/100 priority coverage gap — a blog post would own this question and feed back into the knowledge base.`,
    }
  }

  if (recurring) {
    ideas.faq = {
      title: truncate(input.title, 90),
      reason: `${input.clusterSize} related discussions share this topic — add it to the FAQ.`,
    }
  }

  if (priority != null && engagement(input) >= NEWSLETTER_MIN_ENGAGEMENT) {
    ideas.newsletter = {
      title: truncate(input.title, 90),
      reason: `High engagement (${input.numComments ?? 0} comments, ${input.upvotes ?? 0} upvotes) — a strong weekly-digest pick.`,
    }
  }

  if (input.courseMatchCount === 0 && recurring) {
    ideas.course = {
      title: `New lesson: ${input.clusterTitle ?? topic}`,
      reason: `An unanswered recurring topic with ${input.clusterSize} related discussions — a natural course expansion.`,
    }
  }

  return ideas
}

export function buildRecommendations(input: RecommendationInput): Recommendations {
  const actionId = pickAction(input)
  return {
    action: buildAction(input, actionId),
    responseOutline: buildResponseOutline(input),
    contentIdeas: buildContentIdeas(input),
  }
}
