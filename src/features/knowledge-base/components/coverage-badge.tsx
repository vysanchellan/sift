import { cn } from '@/lib/utils'

import { COVERAGE_ANSWERED, COVERAGE_PARTIALLY_COVERED, COVERAGE_GAP } from '../coverage'

const STATUS_STYLES: Record<string, string> = {
  [COVERAGE_ANSWERED]:
    'bg-bush-600/15 text-bush-700 border-bush-600/30 dark:bg-bush-400/15 dark:text-bush-300 dark:border-bush-400/30',
  [COVERAGE_PARTIALLY_COVERED]:
    'bg-bay-600/15 text-bay-700 border-bay-600/30 dark:bg-bay-400/15 dark:text-bay-300 dark:border-bay-400/30',
  [COVERAGE_GAP]:
    'bg-red-800/15 text-red-300/80 border-red-800/30 dark:bg-red-700/15 dark:text-red-400/80 dark:border-red-700/30',
}

const STATUS_LABELS: Record<string, string> = {
  [COVERAGE_ANSWERED]: 'Answered',
  [COVERAGE_PARTIALLY_COVERED]: 'Partially covered',
  [COVERAGE_GAP]: 'Gap',
}

export interface CoverageBadgeProps {
  status: string | null
  similarity?: number | null
}

export function CoverageBadge({ status, similarity }: CoverageBadgeProps) {
  if (!status) {
    return <span className="text-sand-500 dark:text-sand-400 text-xs">Not compared</span>
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] ?? 'border-border bg-muted text-muted-foreground'
      )}
    >
      {STATUS_LABELS[status] ?? status}
      {similarity != null && (
        <span className="opacity-70">{(Number(similarity) * 100).toFixed(0)}%</span>
      )}
    </span>
  )
}
