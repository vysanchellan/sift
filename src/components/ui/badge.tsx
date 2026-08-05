import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'border-primary/60 bg-transparent text-primary',
        secondary: 'border-border bg-transparent text-foreground/80',
        outline: 'border-border bg-transparent text-muted-foreground',
        muted: 'border-border/60 bg-transparent text-muted-foreground/80',
        success: 'border-primary/40 bg-transparent text-primary',
        warning: 'border-primary/30 bg-transparent text-primary/80',
        destructive: 'border-destructive/40 bg-transparent text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
