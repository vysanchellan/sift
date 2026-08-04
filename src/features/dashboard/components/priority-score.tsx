import { Badge } from '@/components/ui/badge'
import type { PriorityComponents } from '@/features/scoring/priority'
import { cn } from '@/lib/utils'

export type ScoreTone = 'success' | 'warning' | 'muted'

export function scoreTone(score: number | null): ScoreTone {
  if (score == null) return 'muted'
  if (score >= 70) return 'success'
  if (score >= 45) return 'warning'
  return 'muted'
}

const TONE_BADGE: Record<ScoreTone, 'success' | 'warning' | 'muted'> = {
  success: 'success',
  warning: 'warning',
  muted: 'muted',
}

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score == null) {
    return (
      <span className="text-muted-foreground text-xs" title="Not scored yet">
        —
      </span>
    )
  }
  return (
    <Badge variant={TONE_BADGE[scoreTone(score)]} className={cn('tabular-nums', className)}>
      {score}
    </Badge>
  )
}

const COMPONENT_LABELS: Array<[keyof PriorityComponents, string]> = [
  ['buyingIntent', 'Buying intent'],
  ['urgency', 'Urgency'],
  ['competition', 'Low competition'],
  ['visibility', 'Visibility'],
  ['engagement', 'Engagement'],
  ['topicGrowth', 'Topic growth'],
]

export function ScoreBreakdown({
  components,
}: {
  components: PriorityComponents | null | undefined
}) {
  if (!components) {
    return <p className="text-muted-foreground text-sm">No score breakdown yet.</p>
  }

  return (
    <ul className="space-y-2">
      {COMPONENT_LABELS.map(([key, label]) => {
        const value = components[key]
        const pct = Math.round(value * 100)
        return (
          <li key={key}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="tabular-nums">{pct}</span>
            </div>
            <div
              className="bg-muted mt-1 h-1.5 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={label}
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  value >= 0.6
                    ? 'bg-green-600/70'
                    : value >= 0.4
                      ? 'bg-amber-600/70'
                      : 'bg-muted-foreground/40'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
