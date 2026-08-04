'use client'

import { ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDiscussionFilters } from '@/features/dashboard/hooks'
import type { DiscussionFeedFilters, KbGapFilter } from '@/features/dashboard/queries'

import { DashboardError, Skeleton } from './states'

const KB_GAP_OPTIONS: Array<{ value: KbGapFilter; label: string }> = [
  { value: 'all', label: 'All KB states' },
  { value: 'answered', label: 'Answered' },
  { value: 'partially_covered', label: 'Partially covered' },
  { value: 'gap', label: 'Gap' },
  { value: 'not_compared', label: 'Not compared' },
]

const SORT_OPTIONS = [
  { value: 'score', label: 'Priority score' },
  { value: 'date', label: 'Published date' },
]

const ALL = '__all__'

export function FilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: DiscussionFeedFilters
  onChange: (patch: Partial<DiscussionFeedFilters>) => void
  onReset: () => void
}) {
  const { data: options, isLoading, isError, error } = useDiscussionFilters()

  const hasActiveFilters =
    Boolean(filters.sourceId) ||
    Boolean(filters.category) ||
    Boolean(filters.topic) ||
    filters.minScore != null ||
    filters.maxScore != null ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    (filters.kbGap != null && filters.kbGap !== 'all')

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <DashboardError message={error?.message ?? 'Could not load filter options.'} />
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="filter-source">Source</Label>
          <Select
            id="filter-source"
            value={filters.sourceId ?? ALL}
            onValueChange={(value) =>
              onChange({ sourceId: value === ALL ? null : (value as string) })
            }
          >
            <SelectTrigger id="filter-source">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectPopup>
              <SelectList>
                <SelectItem value={ALL}>All sources</SelectItem>
                {options?.sources.map((source) => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-category">Category</Label>
          <Select
            id="filter-category"
            value={filters.category ?? ALL}
            onValueChange={(value) =>
              onChange({ category: value === ALL ? null : (value as string) })
            }
          >
            <SelectTrigger id="filter-category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectPopup>
              <SelectList>
                <SelectItem value={ALL}>All categories</SelectItem>
                {options?.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-min-score">Min priority</Label>
          <Input
            id="filter-min-score"
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={filters.minScore ?? ''}
            onChange={(event) => {
              const value = event.target.value
              onChange({
                minScore: value === '' ? null : Math.min(100, Math.max(0, Number(value))),
              })
            }}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-max-score">Max priority</Label>
          <Input
            id="filter-max-score"
            type="number"
            min={0}
            max={100}
            placeholder="100"
            value={filters.maxScore ?? ''}
            onChange={(event) => {
              const value = event.target.value
              onChange({
                maxScore: value === '' ? null : Math.min(100, Math.max(0, Number(value))),
              })
            }}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-from">From date</Label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => onChange({ from: event.target.value || null })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-to">To date</Label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => onChange({ to: event.target.value || null })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-kb-gap">KB coverage</Label>
          <Select
            id="filter-kb-gap"
            value={filters.kbGap ?? 'all'}
            onValueChange={(value) => onChange({ kbGap: value as KbGapFilter })}
          >
            <SelectTrigger id="filter-kb-gap">
              <SelectValue placeholder="All KB states" />
            </SelectTrigger>
            <SelectPopup>
              <SelectList>
                {KB_GAP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectList>
            </SelectPopup>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-sort">Sort by</Label>
          <div className="flex items-center gap-2">
            <Select
              id="filter-sort"
              value={filters.sort ?? 'score'}
              onValueChange={(value) => onChange({ sort: value as 'score' | 'date' })}
            >
              <SelectTrigger id="filter-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectList>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
              aria-label={filters.order === 'asc' ? 'Sort ascending' : 'Sort descending'}
              title={filters.order === 'asc' ? 'Sort ascending' : 'Sort descending'}
            >
              {filters.order === 'asc' ? <ArrowUp /> : <ArrowDown />}
            </Button>
          </div>
        </div>
      </div>

      {(filters.topic || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.topic && (
            <Badge variant="secondary" className="gap-1.5">
              Topic: {filters.topic}
              <button
                type="button"
                onClick={() => onChange({ topic: null })}
                aria-label={`Remove topic filter ${filters.topic}`}
                className="hover:text-foreground text-muted-foreground outline-none"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw />
              Reset filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
