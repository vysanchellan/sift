import { cn } from '@/lib/utils'

import { COVERAGE_ANSWERED, COVERAGE_PARTIALLY_COVERED, COVERAGE_GAP } from '../coverage'

const STATUS_STYLES: Record<string, string> = {
  [COVERAGE_ANSWERED]: 'bg-green-600/15 text-green-700 border-green-600/30',
  [COVERAGE_PARTIALLY_COVERED]: 'bg-amber-600/15 text-amber-700 border-amber-600/30',
  [COVERAGE_GAP]: 'bg-red-600/15 text-red-700 border-red-600/30',
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
    return <span className="text-muted-foreground text-xs">Not compared</span>
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
