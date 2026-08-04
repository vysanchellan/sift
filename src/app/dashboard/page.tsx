'use client'

import { useState } from 'react'

import type { DiscussionFeedFilters } from '@/features/dashboard/queries'
import { DiscussionsSection } from '@/features/dashboard/components/discussions-section'
import { Overview } from '@/features/dashboard/components/overview'
import { useDashboardOverview } from '@/features/dashboard/hooks'
import { ImportNowButton } from '@/features/reddit/import-now'
import { SourceManager } from '@/features/reddit/source-manager'

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
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            {counts
              ? `${counts.discussions} discussions · ${counts.enriched} enriched · ${counts.sources} sources · ${counts.courses} courses`
              : 'Track priorities, knowledge gaps, and opportunities across your discussions.'}
          </p>
        </div>
        <ImportNowButton />
      </header>

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
