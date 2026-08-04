import type { PriorityComponents } from '@/features/scoring/priority'
import { cn } from '@/lib/utils'

export type ScoreTone = 'success' | 'warning' | 'muted'

export function scoreTone(score: number | null): ScoreTone {
  if (score == null) return 'muted'
  if (score >= 70) return 'success'
  if (score >= 45) return 'warning'
  return 'muted'
}

const TONE_COLORS: Record<ScoreTone, { bg: string; text: string; bar: string }> = {
  success: { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-600' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', bar: 'bg-amber-600' },
  muted: { bg: 'bg-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground/40' },
}

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score == null) {
    return (
      <span className="text-muted-foreground text-xs" title="Not scored yet">
        —
      </span>
    )
  }
  const tone = scoreTone(score)
  const colors = TONE_COLORS[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        colors.bg,
        colors.text,
        className,
      )}
    >
      {score}
    </span>
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
    <ul className="space-y-3">
      {COMPONENT_LABELS.map(([key, label]) => {
        const value = components[key]
        const pct = Math.round(value * 100)
        const tone = scoreTone(pct >= 60 ? 70 : pct >= 40 ? 50 : 30)
        const colors = TONE_COLORS[tone]
        return (
          <li key={key}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn('tabular-nums font-medium', colors.text)}>
                {pct}
              </span>
            </div>
            <div
              className="bg-muted mt-1.5 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={label}
            >
              <div
                className={cn('h-full rounded-full transition-all', colors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}