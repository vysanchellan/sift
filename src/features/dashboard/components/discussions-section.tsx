'use client'

import { Card, CardContent } from '@/components/ui/card'
import { useDiscussionsFeed } from '@/features/dashboard/hooks'
import type { DiscussionFeedFilters } from '@/features/dashboard/queries'

import { DiscussionsTable } from './discussions-table'
import { FilterBar } from './filters'

const DEFAULT_FILTERS: DiscussionFeedFilters = {
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

export function DiscussionsSection({
  filters,
  onChange,
}: {
  filters: DiscussionFeedFilters
  onChange: (patch: Partial<DiscussionFeedFilters>) => void
}) {
  const query = useDiscussionsFeed(filters)

  return (
    <section aria-labelledby="discussions-heading" className="space-y-4">
      <div>
        <h2 id="discussions-heading" className="text-lg font-semibold">
          Discussions
        </h2>
        <p className="text-muted-foreground text-sm">
          Filter and review every imported discussion by priority, source, category, coverage, and
          date.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <FilterBar
            filters={filters}
            onChange={onChange}
            onReset={() => onChange(DEFAULT_FILTERS)}
          />
        </CardContent>
      </Card>

      <DiscussionsTable
        items={query.data?.items ?? []}
        isLoading={query.isPending}
        isError={query.isError}
        error={query.error?.message ?? null}
        total={query.data?.total ?? 0}
        page={filters.page ?? 1}
        pageSize={filters.pageSize ?? 20}
        onPageChange={(page) => onChange({ page })}
      />
    </section>
  )
}
