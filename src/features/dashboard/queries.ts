import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { PriorityComponents } from '@/features/scoring/priority'
import type { RecommendationSignals } from '@/features/dashboard/recommendations'
import { fetchPrioritizedDiscussions } from '@/features/scoring/queries'
import type { Trend } from '@/types'

/**
 * Server functions for the dashboard. Everything is read-only, uses the admin
 * client (service role), and never throws — errors come back on the result
 * object so server actions / TanStack Query hooks can render them inline.
 */

export type KbGapFilter = 'all' | 'answered' | 'partially_covered' | 'gap' | 'not_compared'

/** Flat, UI-friendly representation of a discussion with its derived signals. */
export interface FeedDiscussion {
  id: string
  title: string
  body: string | null
  summary: string | null
  url: string | null
  author: string | null
  score: number
  numComments: number
  publishedAt: string | null
  fetchedAt: string
  subreddit: string | null
  keywords: string[]
  category: string | null
  sourceId: string | null
  sourceName: string | null
  sourceKind: string | null
  priorityScore: number | null
  priorityComponents: PriorityComponents | null
  coverageStatus: string | null
  coverageSimilarity: number | null
}

export interface DiscussionFeedFilters {
  sourceId?: string | null
  category?: string | null
  /** Overlaps the discussion's keywords (from a trending topic click). */
  topic?: string | null
  minScore?: number | null
  maxScore?: number | null
  /** ISO date strings (inclusive). */
  from?: string | null
  to?: string | null
  kbGap?: KbGapFilter | null
  sort?: 'score' | 'date'
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface DiscussionFeedResult {
  items: FeedDiscussion[]
  total: number
  page: number
  pageSize: number
  error?: string
}

export interface SourceActivity {
  id: string
  name: string
  kind: string
  count: number
  comments: number
  upvotes: number
}

export interface TrendItem {
  topic: string
  direction: string
  score: number
  volumeChange: number
  engagementChange: number
  volumeCurrent: number
}

export interface DashboardCounts {
  discussions: number
  enriched: number
  sources: number
  courses: number
}

export interface DashboardOverview {
  sourcesToday: SourceActivity[]
  topPriority: FeedDiscussion[]
  trendingTopics: TrendItem[]
  opportunities: FeedDiscussion[]
  counts: DashboardCounts
}

export interface OverviewResult {
  data: DashboardOverview | null
  error?: string
}

export interface CourseMatchDetail {
  id: string
  score: number | null
  reason: string | null
  sectionTitle: string | null
  lessonTitle: string | null
}

export interface ClusterDetail {
  id: string
  title: string
  summary: string | null
  memberCount: number
}

export interface DiscussionDetail {
  discussion: FeedDiscussion
  signals: RecommendationSignals | null
  scoreProvider: string | null
  scoreModel: string | null
  confidence: number | null
  priorityReasoning: string | null
  priorityScoredAt: string | null
  matchedContent: string | null
  courseMatches: CourseMatchDetail[]
  clusters: ClusterDetail[]
}

export interface DetailResult {
  data: DiscussionDetail | null
  error?: string
}

export interface FilterOption {
  id: string
  name: string
}

export interface DiscussionFilters {
  sources: FilterOption[]
  categories: string[]
}

export interface FiltersResult {
  data: DiscussionFilters | null
  error?: string
}

/** Cap on rows pulled before JS-side filtering (personal-dataset friendly). */
export const FEED_FETCH_CAP = 1000
export const OVERVIEW_TOP_COUNT = 5

interface PriorityRow {
  score: number
  components: PriorityComponents
}

type FeedRow = {
  id: string
  title: string
  body: string | null
  summary: string | null
  url: string | null
  author: string | null
  score: number
  num_comments: number
  published_at: string | null
  fetched_at: string
  subreddit: string | null
  keywords: string[]
  category: string | null
  source_id: string | null
  sources: { name: string; kind: string } | null
  discussion_priority: PriorityRow[] | null
  discussion_coverage: Array<{ status: string | null; best_similarity: number | null }> | null
}

function toFeedDiscussion(row: FeedRow): FeedDiscussion {
  const priority = row.discussion_priority?.[0] ?? null
  const coverage = row.discussion_coverage?.[0] ?? null
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    summary: row.summary,
    url: row.url,
    author: row.author,
    score: row.score,
    numComments: row.num_comments,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    subreddit: row.subreddit,
    keywords: row.keywords ?? [],
    category: row.category,
    sourceId: row.source_id,
    sourceName: row.sources?.name ?? null,
    sourceKind: row.sources?.kind ?? null,
    priorityScore: priority?.score ?? null,
    priorityComponents: priority?.components ?? null,
    coverageStatus: coverage?.status ?? null,
    coverageSimilarity: coverage?.best_similarity ?? null,
  }
}

export async function fetchDiscussionFeed(
  userId: string,
  filters: DiscussionFeedFilters = {}
): Promise<DiscussionFeedResult> {
  const supabase = createAdminClient()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20))

  const { data, error } = await supabase
    .from('discussions')
    .select(
      'id, title, body, summary, url, author, score, num_comments, published_at, fetched_at, subreddit, keywords, category, source_id, sources(name, kind), discussion_priority(score, components), discussion_coverage(status, best_similarity)'
    )
    .eq('user_id', userId)
    .limit(FEED_FETCH_CAP)

  if (error) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      error: `Could not load discussions: ${error.message}`,
    }
  }

  let items = ((data ?? []) as unknown as FeedRow[]).map(toFeedDiscussion)

  if (filters.sourceId) {
    items = items.filter((item) => item.sourceId === filters.sourceId)
  }
  if (filters.category) {
    items = items.filter((item) => item.category === filters.category)
  }
  if (filters.topic) {
    const topic = filters.topic.toLowerCase()
    items = items.filter((item) =>
      item.keywords.some((keyword) => keyword.toLowerCase().includes(topic))
    )
  }
  if (filters.minScore != null) {
    items = items.filter(
      (item) => item.priorityScore != null && item.priorityScore >= filters.minScore!
    )
  }
  if (filters.maxScore != null) {
    items = items.filter(
      (item) => item.priorityScore != null && item.priorityScore <= filters.maxScore!
    )
  }
  if (filters.from) {
    const from = new Date(filters.from).getTime()
    items = items.filter((item) => {
      const at = new Date(item.publishedAt ?? item.fetchedAt).getTime()
      return at >= from
    })
  }
  if (filters.to) {
    const to = new Date(`${filters.to}T23:59:59.999`).getTime()
    items = items.filter((item) => {
      const at = new Date(item.publishedAt ?? item.fetchedAt).getTime()
      return at <= to
    })
  }
  if (filters.kbGap && filters.kbGap !== 'all') {
    if (filters.kbGap === 'not_compared') {
      items = items.filter((item) => item.coverageStatus === null)
    } else {
      items = items.filter((item) => item.coverageStatus === filters.kbGap)
    }
  }

  const order = filters.order ?? 'desc'
  const sort = filters.sort ?? 'score'
  if (sort === 'date') {
    const dir = order === 'asc' ? 1 : -1
    items.sort((a, b) => {
      const at = new Date(a.publishedAt ?? a.fetchedAt).getTime()
      const bt = new Date(b.publishedAt ?? b.fetchedAt).getTime()
      return (at - bt) * dir
    })
  } else {
    const dir = order === 'asc' ? 1 : -1
    items.sort((a, b) => {
      const av = a.priorityScore ?? -1
      const bv = b.priorityScore ?? -1
      if (av === bv) return 0
      return (av - bv) * dir
    })
  }

  const total = items.length
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total, page, pageSize }
}

async function fetchCounts(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<DashboardCounts> {
  const [discussions, enriched, sources, courses] = await Promise.all([
    supabase.from('discussions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase
      .from('discussions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('summary', 'is', null),
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  return {
    discussions: discussions.count ?? 0,
    enriched: enriched.count ?? 0,
    sources: sources.count ?? 0,
    courses: courses.count ?? 0,
  }
}

export async function fetchDashboardOverview(userId: string): Promise<OverviewResult> {
  const supabase = createAdminClient()

  const [counts, feed, top, trends, sources] = await Promise.all([
    fetchCounts(supabase, userId),
    fetchDiscussionFeed(userId, { sort: 'score', order: 'desc', pageSize: OVERVIEW_TOP_COUNT }),
    fetchPrioritizedDiscussions(userId, {
      limit: OVERVIEW_TOP_COUNT,
      sortBy: 'score',
      order: 'desc',
    }),
    supabase
      .from('trends')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', 'rising')
      .order('score', { ascending: false })
      .limit(OVERVIEW_TOP_COUNT),
    supabase
      .from('discussions')
      .select('source_id, published_at, fetched_at, score, num_comments, sources(id, name, kind)')
      .eq('user_id', userId),
  ])

  if (feed.error) {
    return { data: null, error: feed.error }
  }

  const sourceNames = new Map<string, { name: string; kind: string }>()
  for (const row of (sources.data ?? []) as Array<{
    sources: { id: string; name: string; kind: string } | null
  }>) {
    if (row.sources)
      sourceNames.set(row.sources.id, { name: row.sources.name, kind: row.sources.kind })
  }

  const trendingTopics: TrendItem[] = ((trends.data ?? []) as Trend[]).map((trend) => ({
    topic: trend.topic,
    direction: trend.direction,
    score: Number(trend.score),
    volumeChange: Number(trend.volume_change),
    engagementChange: Number(trend.engagement_change),
    volumeCurrent: trend.volume_current,
  }))

  const opportunities: FeedDiscussion[] = (top.items ?? [])
    .filter((item) => {
      const c = item.priority.components as PriorityComponents | null
      return c != null && c.buyingIntent >= 0.55 && c.competition >= 0.55
    })
    .slice(0, OVERVIEW_TOP_COUNT)
    .map((item) => {
      const source = item.discussion.source_id ? sourceNames.get(item.discussion.source_id) : null
      return toFeedDiscussion({
        ...(item.discussion as unknown as FeedRow),
        source_id: item.discussion.source_id,
        sources: source ?? null,
        discussion_priority: [
          {
            score: item.priority.score,
            components: item.priority.components as unknown as PriorityComponents,
          },
        ],
        discussion_coverage: null,
      })
    })

  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()

  const bySource = new Map<string, SourceActivity>()
  for (const row of (sources.data ?? []) as Array<{
    source_id: string
    published_at: string | null
    fetched_at: string
    score: number
    num_comments: number
    sources: { id: string; name: string; kind: string } | null
  }>) {
    const at = new Date(row.published_at ?? row.fetched_at).getTime()
    if (Number.isNaN(at) || at < todayStart || at > Date.now() + 60_000) continue
    if (!row.sources) continue
    const entry = bySource.get(row.sources.id) ?? {
      id: row.sources.id,
      name: row.sources.name,
      kind: row.sources.kind,
      count: 0,
      comments: 0,
      upvotes: 0,
    }
    entry.count += 1
    entry.comments += row.num_comments
    entry.upvotes += row.score
    bySource.set(row.sources.id, entry)
  }

  const sourcesToday = Array.from(bySource.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, OVERVIEW_TOP_COUNT)

  return {
    data: {
      sourcesToday,
      topPriority: feed.items,
      trendingTopics,
      opportunities,
      counts,
    },
  }
}

export async function fetchDiscussionDetail(
  userId: string,
  discussionId: string
): Promise<DetailResult> {
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('discussions')
    .select(
      `*,
      sources(name, kind),
      discussion_priority(score, components, reasoning, scored_at),
      discussion_scores(provider, model, score, confidence, signals),
      discussion_coverage(status, best_similarity, matched_content, updated_at),
      course_discussion_matches(id, score, reason, course_sections(id, title), course_lessons(id, title))`
    )
    .eq('id', discussionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: `Could not load discussion: ${error.message}` }
  }
  if (!row) {
    return { data: null, error: 'Discussion not found.' }
  }

  const feed = toFeedDiscussion(row as unknown as FeedRow)

  const priority =
    (
      row.discussion_priority as unknown as Array<{
        score: number
        components: unknown
        reasoning: string | null
        scored_at: string | null
      }> | null
    )?.[0] ?? null
  const scoreRows =
    (row.discussion_scores as unknown as Array<{
      provider: string | null
      model: string | null
      score: number | null
      confidence: number | null
      signals: unknown
    }> | null) ?? []
  scoreRows.sort((a, b) => (a.score ?? -1) - (b.score ?? -1))
  const latestScore = scoreRows[scoreRows.length - 1] ?? null

  const coverage =
    (
      row.discussion_coverage as unknown as Array<{
        status: string | null
        best_similarity: number | null
        matched_content: string | null
      }> | null
    )?.[0] ?? null

  const courseMatches: CourseMatchDetail[] = (
    (row.course_discussion_matches as unknown as Array<{
      id: string
      score: number | null
      reason: string | null
      course_sections: { id: string; title: string } | null
      course_lessons: { id: string; title: string } | null
    }>) ?? []
  ).map((match) => ({
    id: match.id,
    score: match.score != null ? Number(match.score) : null,
    reason: match.reason,
    sectionTitle: match.course_sections?.title ?? null,
    lessonTitle: match.course_lessons?.title ?? null,
  }))

  const { data: clusters, error: clustersError } = await supabase
    .from('clusters')
    .select('id, title, summary, discussion_ids')
    .eq('user_id', userId)
    .contains('discussion_ids', [discussionId])

  if (clustersError) {
    return { data: null, error: `Could not load clusters: ${clustersError.message}` }
  }

  const clusterDetails: ClusterDetail[] = (
    (clusters ?? []) as Array<{
      id: string
      title: string
      summary: string | null
      discussion_ids: string[]
    }>
  ).map((cluster) => ({
    id: cluster.id,
    title: cluster.title,
    summary: cluster.summary,
    memberCount: cluster.discussion_ids.length,
  }))

  return {
    data: {
      discussion: feed,
      signals: (latestScore?.signals as RecommendationSignals | null) ?? null,
      scoreProvider: latestScore?.provider ?? null,
      scoreModel: latestScore?.model ?? null,
      confidence: latestScore?.confidence != null ? Number(latestScore.confidence) : null,
      priorityReasoning: priority?.reasoning ?? null,
      priorityScoredAt: priority?.scored_at ?? null,
      matchedContent: coverage?.matched_content ?? null,
      courseMatches,
      clusters: clusterDetails,
    },
  }
}

export async function fetchDiscussionFilters(userId: string): Promise<FiltersResult> {
  const supabase = createAdminClient()

  const [sources, categories] = await Promise.all([
    supabase
      .from('sources')
      .select('id, name, kind')
      .eq('user_id', userId)
      .order('name', { ascending: true }),
    supabase
      .from('discussions')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null),
  ])

  if (sources.error) {
    return { data: null, error: `Could not load sources: ${sources.error.message}` }
  }

  const seen = new Set<string>()
  const categoryList: string[] = []
  for (const row of (categories.data ?? []) as Array<{ category: string }>) {
    if (row.category && !seen.has(row.category)) {
      seen.add(row.category)
      categoryList.push(row.category)
    }
  }
  categoryList.sort()

  const sourceOptions: FilterOption[] = (
    (sources.data ?? []) as Array<{
      id: string
      name: string
      kind: string
    }>
  ).map((source) => ({
    id: source.id,
    name: source.name,
  }))

  return {
    data: {
      sources: sourceOptions,
      categories: categoryList,
    },
  }
}
