'use client'

import Link from 'next/link'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FeedDiscussion } from '@/features/dashboard/queries'
import { CoverageBadge } from '@/features/knowledge-base/components/coverage-badge'

import { ScoreBadge } from './priority-score'
import { DashboardEmpty, DashboardError, SkeletonList } from './states'

const columnHelper = createColumnHelper<FeedDiscussion>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Discussion',
    cell: ({ row, getValue }) => (
      <div className="min-w-0 max-w-md">
        <Link
          href={`/dashboard/discussions/${row.original.id}`}
          className="font-medium text-foreground hover:underline hover:text-primary transition-colors"
        >
          {String(getValue())}
        </Link>
        {row.original.summary && (
          <p className="text-muted-foreground line-clamp-2 mt-0.5 text-xs leading-relaxed">
            {row.original.summary}
          </p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('sourceName', {
    header: 'Source',
    cell: ({ row }) => {
      const name =
        row.original.sourceName ?? (row.original.subreddit ? `r/${row.original.subreddit}` : null)
      return <span className="text-muted-foreground truncate text-sm">{name ?? '—'}</span>
    },
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: ({ row }) =>
      row.original.category ? (
        <Badge variant="outline" className="capitalize">
          {row.original.category}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  }),
  columnHelper.accessor('priorityScore', {
    header: 'Priority',
    cell: ({ row }) => <ScoreBadge score={row.original.priorityScore} />,
  }),
  columnHelper.accessor('coverageStatus', {
    header: 'KB',
    cell: ({ row }) => (
      <CoverageBadge
        status={row.original.coverageStatus}
        similarity={row.original.coverageSimilarity}
      />
    ),
  }),
  columnHelper.accessor('numComments', {
    header: 'Engagement',
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums text-sm">
        {row.original.numComments} comments · {row.original.score} pts
      </span>
    ),
  }),
  columnHelper.accessor('publishedAt', {
    header: 'Published',
    cell: ({ row }) => {
      const at = row.original.publishedAt ?? row.original.fetchedAt
      return (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {at ? new Date(at).toLocaleDateString() : '—'}
        </span>
      )
    },
  }),
]

export function DiscussionsTable({
  items,
  isLoading,
  isError,
  error,
  total,
  page,
  pageSize,
  onPageChange,
}: {
  items: FeedDiscussion[]
  isLoading: boolean
  isError: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="rounded-lg border">
          <SkeletonList rows={5} />
        </div>
      ) : isError ? (
        <DashboardError message={error ?? 'Could not load discussions.'} />
      ) : items.length === 0 ? (
        <DashboardEmpty
          title="No discussions match"
          description="Try clearing or widening your filters, or import more discussions first."
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {total} discussion{total === 1 ? '' : 's'}
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-semibold uppercase tracking-wider"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav aria-label="Table pagination" className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ArrowLeft />
              Previous
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ArrowRight />
            </Button>
          </nav>
        </>
      )}
    </div>
  )
}