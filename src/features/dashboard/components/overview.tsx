'use client'

import Link from 'next/link'
import { motion, MotionConfig } from 'framer-motion'
import { Activity, MessagesSquare, Sparkles, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardOverview } from '@/features/dashboard/queries'

import { ScoreBadge } from './priority-score'
import { DashboardEmpty, DashboardError, SkeletonCardGrid } from './states'

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

function pctChange(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${Math.round(value * 100)}%`
}

export function Overview({
  data,
  isLoading,
  error,
  onSelectSource,
  onSelectTopic,
}: {
  data: DashboardOverview | null
  isLoading: boolean
  error: string | null
  onSelectSource: (sourceId: string) => void
  onSelectTopic: (topic: string) => void
}) {
  if (isLoading) return <SkeletonCardGrid />
  if (error) return <DashboardError message={error} />
  if (!data)
    return (
      <DashboardEmpty
        title="No overview yet"
        description="Import and enrich discussions to populate the dashboard."
      />
    )

  const cards = [
    {
      key: 'sources',
      icon: <MessagesSquare className="text-bush-600 dark:text-bush-400 size-4" />,
      title: 'Most active sources',
      description: 'By discussion count published today.',
      body:
        data.sourcesToday.length === 0 ? (
          <p className="text-sand-500 dark:text-sand-400 text-sm">No discussion activity today.</p>
        ) : (
          <ul className="space-y-1">
            {data.sourcesToday.map((source) => (
              <li key={source.id}>
                <button
                  type="button"
                  onClick={() => onSelectSource(source.id)}
                  className="hover:bg-accent/50 focus-visible:ring-ring group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-2"
                >
                  <span className="group-hover:text-bush-600 dark:group-hover:text-bush-400 min-w-0 truncate font-medium">
                    {source.name}
                  </span>
                  <span className="text-sand-500 dark:text-sand-400 flex shrink-0 items-center gap-2 text-xs">
                    <span className="tabular-nums">{compact(source.comments)}</span>
                    <Badge variant="outline" className="tabular-nums">
                      {source.count}
                    </Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'priority',
      icon: <Activity className="text-bush-600 dark:text-bush-400 size-4" />,
      title: 'Top priority',
      description: 'Highest transparent priority scores.',
      body:
        data.topPriority.length === 0 ? (
          <p className="text-sand-500 dark:text-sand-400 text-sm">
            No scored discussions yet. Run the scoring pipeline.
          </p>
        ) : (
          <ul className="space-y-1">
            {data.topPriority.map((discussion) => (
              <li key={discussion.id}>
                <Link
                  href={`/dashboard/discussions/${discussion.id}`}
                  className="hover:bg-accent/50 focus-visible:ring-ring group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2"
                >
                  <span className="group-hover:text-bush-600 dark:group-hover:text-bush-400 min-w-0 truncate font-medium">
                    {discussion.title}
                  </span>
                  <ScoreBadge score={discussion.priorityScore} />
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'trends',
      icon: <TrendingUp className="text-bush-600 dark:text-bush-400 size-4" />,
      title: 'Trending topics',
      description: 'Rising keyword volume and engagement.',
      body:
        data.trendingTopics.length === 0 ? (
          <p className="text-sand-500 dark:text-sand-400 text-sm">
            No rising topics yet. Run trend detection.
          </p>
        ) : (
          <ul className="space-y-1">
            {data.trendingTopics.map((trend) => (
              <li key={trend.topic}>
                <button
                  type="button"
                  onClick={() => onSelectTopic(trend.topic)}
                  className="hover:bg-accent/50 focus-visible:ring-ring group flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none focus-visible:ring-2"
                >
                  <span className="group-hover:text-bush-600 dark:group-hover:text-bush-400 min-w-0 truncate font-medium">
                    {trend.topic}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <Badge variant="success">{pctChange(trend.volumeChange)}</Badge>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: 'opportunities',
      icon: <Sparkles className="text-bush-600 dark:text-bush-400 size-4" />,
      title: 'Opportunities',
      description: 'High buying intent, low competition.',
      body:
        data.opportunities.length === 0 ? (
          <p className="text-sand-500 dark:text-sand-400 text-sm">
            No low-competition, high-intent picks right now.
          </p>
        ) : (
          <ul className="space-y-1">
            {data.opportunities.map((discussion) => (
              <li key={discussion.id}>
                <Link
                  href={`/dashboard/discussions/${discussion.id}`}
                  className="hover:bg-accent/50 focus-visible:ring-ring group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2"
                >
                  <span className="group-hover:text-bush-600 dark:group-hover:text-bush-400 min-w-0 truncate font-medium">
                    {discussion.title}
                  </span>
                  <ScoreBadge score={discussion.priorityScore} />
                </Link>
              </li>
            ))}
          </ul>
        ),
    },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Dashboard overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
          >
            <Card className="hover:border-border/80 h-full transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {card.icon}
                  {card.title}
                </CardTitle>
                <CardDescription className="text-xs">{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">{card.body}</CardContent>
            </Card>
          </motion.div>
        ))}
      </section>
    </MotionConfig>
  )
}
