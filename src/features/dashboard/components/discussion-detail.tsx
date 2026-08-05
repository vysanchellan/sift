'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  Lightbulb,
  Mail,
  MessageSquare,
  Newspaper,
  Sparkles,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDiscussionDetail } from '@/features/dashboard/hooks'
import type { DiscussionDetail } from '@/features/dashboard/queries'
import {
  buildRecommendations,
  type ContentIdeas,
  type RecommendationInput,
} from '@/features/dashboard/recommendations'
import { CoverageBadge } from '@/features/knowledge-base/components/coverage-badge'

import { ScoreBadge, ScoreBreakdown } from './priority-score'
import { DashboardEmpty, DashboardError, SkeletonList } from './states'

const ACTION_BADGE: Record<string, 'default' | 'warning' | 'secondary' | 'muted'> = {
  action: 'default',
  create: 'warning',
  expand: 'secondary',
  watch: 'muted',
}

const IDEA_ICONS: Record<string, typeof FileText> = {
  blog: FileText,
  faq: MessageSquare,
  newsletter: Mail,
  course: BookOpen,
}

function toRecommendationInput(data: DiscussionDetail): RecommendationInput {
  const bestMatch = data.courseMatches[0] ?? null
  const biggestCluster =
    data.clusters.length > 0
      ? data.clusters.reduce((a, b) => (b.memberCount > a.memberCount ? b : a))
      : null
  return {
    title: data.discussion.title,
    summary: data.discussion.summary,
    keywords: data.discussion.keywords,
    category: data.discussion.category,
    signals: data.signals,
    priorityScore: data.discussion.priorityScore,
    components: data.discussion.priorityComponents,
    coverageStatus: data.discussion.coverageStatus,
    bestSimilarity: data.discussion.coverageSimilarity,
    courseMatchCount: data.courseMatches.length,
    courseMatchTitle: bestMatch?.sectionTitle ?? bestMatch?.lessonTitle ?? null,
    clusterSize: biggestCluster?.memberCount ?? 0,
    clusterTitle: biggestCluster?.title ?? null,
    upvotes: data.discussion.score,
    numComments: data.discussion.numComments,
  }
}

function contentIdeas(ideas: ContentIdeas) {
  const entries = Object.entries(ideas) as Array<
    [keyof ContentIdeas, NonNullable<ContentIdeas[keyof ContentIdeas]>]
  >
  if (entries.length === 0) {
    return (
      <p className="text-sand-500 dark:text-sand-400 text-sm">
        No content ideas right now. Ideas surface for coverage gaps, recurring topics, and
        high-engagement discussions.
      </p>
    )
  }
  return (
    <ul className="space-y-4">
      {entries.map(([key, idea]) => {
        const Icon = IDEA_ICONS[key] ?? Lightbulb
        return (
          <li key={key} className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="text-sand-500 dark:text-sand-400 size-4" />
              <p className="font-medium capitalize">{key}</p>
            </div>
            <p className="pl-6 text-sm font-medium">{idea.title}</p>
            <p className="text-sand-500 dark:text-sand-400 pl-6 text-sm leading-relaxed">
              {idea.reason}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

export function DiscussionDetailView({ discussionId }: { discussionId: string }) {
  const { data, isLoading, isError, error } = useDiscussionDetail(discussionId)

  const recommendations = useMemo(
    () => (data ? buildRecommendations(toRecommendationInput(data)) : null),
    [data]
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonList rows={3} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-5">
            <SkeletonList rows={4} />
          </div>
          <div className="rounded-lg border p-5">
            <SkeletonList rows={4} />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return <DashboardError message={error?.message ?? 'Could not load the discussion.'} />
  }

  if (!data) {
    return (
      <DashboardEmpty
        title="Discussion not found"
        description="It may have been deleted, or it belongs to another account."
      />
    )
  }

  const { discussion } = data
  const published = discussion.publishedAt ?? discussion.fetchedAt
  const confidence =
    data.confidence != null ? `${Math.round(data.confidence * 100)}% confidence` : null

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sand-600 dark:text-sand-400 hover:text-bush-600 dark:hover:text-bush-400 focus-visible:ring-bush-500 inline-flex items-center gap-1.5 rounded-md px-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <section aria-label="Discussion" className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{discussion.title}</h1>
        <div className="text-sand-600 dark:text-sand-400 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {discussion.sourceName && <span className="font-medium">{discussion.sourceName}</span>}
          {discussion.subreddit && <span>r/{discussion.subreddit}</span>}
          {discussion.author && <span>by {discussion.author}</span>}
          {published && <span>{new Date(published).toLocaleString()}</span>}
          <span className="tabular-nums">
            {discussion.numComments} comments · {discussion.score} points
          </span>
          {discussion.url && (
            <a
              href={discussion.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bush-600 dark:text-bush-400 hover:text-bush-700 dark:hover:text-bush-300 inline-flex items-center gap-1 underline underline-offset-2 transition-colors"
            >
              Open original
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {discussion.summary ? (
              <p className="text-sm leading-relaxed">{discussion.summary}</p>
            ) : (
              <p className="text-sand-500 dark:text-sand-400 text-sm">
                No summary yet. Run the enrichment pipeline to generate one.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {discussion.category ? (
                <Badge variant="outline" className="capitalize">
                  {discussion.category}
                </Badge>
              ) : (
                <Badge variant="muted">Uncategorized</Badge>
              )}
              {discussion.keywords.slice(0, 8).map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
            {discussion.body && (
              <details className="text-sand-600 dark:text-sand-400 text-sm">
                <summary className="hover:text-foreground cursor-pointer transition-colors">
                  Read the full post
                </summary>
                <p className="mt-2 leading-relaxed whitespace-pre-wrap">{discussion.body}</p>
              </details>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Priority score
              <ScoreBadge score={discussion.priorityScore} />
            </CardTitle>
            <CardDescription>Transparent 0–100 score with per-factor reasoning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreBreakdown components={discussion.priorityComponents} />
            {data.priorityReasoning ? (
              <p className="text-sand-600 dark:text-sand-400 border-t pt-3 text-sm leading-relaxed">
                {data.priorityReasoning}
              </p>
            ) : (
              <p className="text-sand-500 dark:text-sand-400 text-sm">
                Not scored yet. Run the scoring pipeline to see the factor breakdown.
              </p>
            )}
            {(data.scoreProvider || confidence) && (
              <p className="text-sand-500 dark:text-sand-400 text-xs">
                {data.scoreProvider ? `Provider: ${data.scoreProvider}` : ''}
                {data.scoreModel ? ` · Model: ${data.scoreModel}` : ''}
                {confidence ? ` · ${confidence}` : ''}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge base coverage</CardTitle>
            <CardDescription>
              Whether your uploaded documents already answer this discussion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CoverageBadge
              status={discussion.coverageStatus}
              similarity={discussion.coverageSimilarity}
            />
            {data.matchedContent ? (
              <p className="text-sand-600 dark:text-sand-400 text-sm leading-relaxed">
                Best match: &ldquo;
                {data.matchedContent.length > 280
                  ? `${data.matchedContent.slice(0, 280)}…`
                  : data.matchedContent}
                &rdquo;
              </p>
            ) : (
              <p className="text-sand-500 dark:text-sand-400 text-sm">
                {discussion.coverageStatus
                  ? 'No matched content excerpt is stored for this verdict.'
                  : 'Not compared yet. Run &ldquo;Compare discussions against KB&rdquo; from the Knowledge base page.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-bush-600 dark:text-bush-400 size-4" />
              Recommended action
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations ? (
              <>
                <Badge variant={ACTION_BADGE[recommendations.action.tone] ?? 'default'}>
                  {recommendations.action.label}
                </Badge>
                <p className="text-sm leading-relaxed">{recommendations.action.reason}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="text-sand-500 dark:text-sand-400 size-4" />
              Suggested response outline
            </CardTitle>
            <CardDescription>A skeleton for answering this discussion in-thread.</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations ? (
              <ol className="space-y-2">
                {recommendations.responseOutline.map((step, index) => (
                  <li
                    key={index}
                    className="text-sand-600 dark:text-sand-400 flex gap-3 text-sm leading-relaxed"
                  >
                    <span className="text-foreground/40 mt-0.5 shrink-0 tabular-nums">
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sand-500 dark:text-sand-400 text-sm">No outline available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="text-sand-500 dark:text-sand-400 size-4" />
              Content ideas
            </CardTitle>
            <CardDescription>Blog, FAQ, newsletter, and course-expansion angles.</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations ? contentIdeas(recommendations.contentIdeas) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="text-sand-500 dark:text-sand-400 size-4" />
            Course-section matches
          </CardTitle>
          <CardDescription>
            Sections and lessons in your courses that this discussion maps to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.courseMatches.length === 0 ? (
            <p className="text-sand-500 dark:text-sand-400 text-sm">
              No course matches yet. Add courses and run &ldquo;Match course content&rdquo; from the
              Courses page.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.courseMatches.map((match) => (
                <li
                  key={match.id}
                  className="bg-sand-100/50 dark:bg-sand-800/30 hover:bg-sand-100 dark:hover:bg-sand-800/50 flex items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {match.lessonTitle
                        ? `${match.sectionTitle ?? 'Section'} → ${match.lessonTitle}`
                        : (match.sectionTitle ?? 'Untitled section')}
                    </p>
                    {match.reason && (
                      <p className="text-sand-500 dark:text-sand-400 truncate text-xs">
                        {match.reason}
                      </p>
                    )}
                  </div>
                  {match.score != null && (
                    <span className="text-sand-500 dark:text-sand-400 shrink-0 text-xs font-medium tabular-nums">
                      {(match.score * 100).toFixed(0)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link
              href="/dashboard/courses"
              className="text-sand-600 dark:text-sand-400 hover:text-bush-600 dark:hover:text-bush-400 inline-flex items-center gap-1.5 underline underline-offset-2 transition-colors"
            >
              <Newspaper className="size-3" />
              Manage courses
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
