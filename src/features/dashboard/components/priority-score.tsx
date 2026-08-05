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
  success: { bg: 'bg-bush-100 dark:bg-bush-900', text: 'text-bush-800 dark:text-bush-200', bar: 'bg-bush-600 dark:bg-bush-400' },
  warning: { bg: 'bg-bay-100 dark:bg-bay-900', text: 'text-bay-800 dark:text-bay-200', bar: 'bg-bay-600 dark:bg-bay-400' },
  muted: { bg: 'bg-sand-200 dark:bg-sand-800', text: 'text-sand-600 dark:text-sand-400', bar: 'bg-sand-400 dark:bg-sand-600' },
}

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score == null) {
    return (
      <span className="text-sand-500 dark:text-sand-400 text-xs" title="Not scored yet">
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
    return <p className="text-sand-500 dark:text-sand-400 text-sm">No score breakdown yet.</p>
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
              <span className="text-sand-600 dark:text-sand-400">{label}</span>
              <span className={cn('tabular-nums font-medium', colors.text)}>
                {pct}
              </span>
            </div>
            <div
              className="bg-sand-200 dark:bg-sand-800 mt-1.5 h-2 overflow-hidden rounded-full"
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