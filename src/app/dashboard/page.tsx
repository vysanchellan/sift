'use client'

import { useState } from 'react'

import type { DiscussionFeedFilters } from '@/features/dashboard/queries'
import { DiscussionsSection } from '@/features/dashboard/components/discussions-section'
import { Overview } from '@/features/dashboard/components/overview'
import { useDashboardOverview } from '@/features/dashboard/hooks'
import { ImportNowButton } from '@/features/reddit/import-now'
import { SourceManager } from '@/features/reddit/source-manager'
import { Card } from '@/components/ui/card'

const INITIAL_FILTERS: DiscussionFeedFilters = {
  sourceId: null,
  category: null,
  topic: null,
  minScore: null,
  maxScore: null,
  from: null,
  to: null,
  kbGap: null,
  sort: 'score',
  order: 'desc',
  page: 1,
}

export default function DashboardPage() {
  const overview = useDashboardOverview()
  const [filters, setFilters] = useState<DiscussionFeedFilters>(INITIAL_FILTERS)

  function patchFilters(patch: Partial<DiscussionFeedFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  const counts = overview.data?.counts

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground font-serif text-3xl font-normal md:text-4xl">Dashboard</h1>
        </div>
      </header>

      {/* Prominent Hero Card */}
      <Card className="border-border/80 relative overflow-hidden rounded-xl border p-8 md:p-10">
        <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent to-transparent" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <h2 className="text-foreground font-serif text-2xl leading-tight font-normal md:text-3xl">
            Turn Reddit discussions into structured, scored knowledge
          </h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed md:text-base">
            Track priorities, identify critical knowledge gaps, and map out opportunities across
            your imported discussion threads.
          </p>
          <div className="pt-2">
            <ImportNowButton />
          </div>
        </div>
      </Card>

      {/* Elegant Stat Cards */}
      {counts && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-border/60 border p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Discussions
            </p>
            <p className="text-primary mt-2 font-serif text-3xl font-normal md:text-4xl">
              {counts.discussions}
            </p>
          </Card>
          <Card className="border-border/60 border p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Enriched
            </p>
            <p className="text-primary mt-2 font-serif text-3xl font-normal md:text-4xl">
              {counts.enriched}
            </p>
          </Card>
          <Card className="border-border/60 border p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Sources
            </p>
            <p className="text-primary mt-2 font-serif text-3xl font-normal md:text-4xl">
              {counts.sources}
            </p>
          </Card>
          <Card className="border-border/60 border p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Courses
            </p>
            <p className="text-primary mt-2 font-serif text-3xl font-normal md:text-4xl">
              {counts.courses}
            </p>
          </Card>
        </div>
      )}

      <Overview
        data={overview.data ?? null}
        isLoading={overview.isPending}
        error={overview.error?.message ?? null}
        onSelectSource={(sourceId) => patchFilters({ sourceId, page: 1 })}
        onSelectTopic={(topic) => patchFilters({ topic, page: 1 })}
      />

      <SourceManager />

      <DiscussionsSection filters={filters} onChange={patchFilters} />
    </div>
  )
}
