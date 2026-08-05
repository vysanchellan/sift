import { CircleAlert, SearchX } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export { Skeleton }

export function DashboardError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function DashboardEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-border/80 mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="border-primary/20 bg-primary/5 flex size-14 items-center justify-center rounded-full border">
        <SearchX className="text-primary size-6" />
      </div>
      <h3 className="text-foreground font-serif text-xl font-normal">{title}</h3>
      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">{description}</p>
    </div>
  )
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading overview"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-44 rounded-lg" />
      ))}
    </div>
  )
}
