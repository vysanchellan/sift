import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-border bg-secondary text-secondary-foreground',
        outline: 'border-border bg-background text-muted-foreground',
        muted: 'border-border bg-muted text-muted-foreground',
        success: 'border-bush-600/30 bg-bush-600/10 text-bush-700',
        warning: 'border-bay-600/30 bg-bay-600/10 text-bay-700 dark:border-bay-400/30 dark:bg-bay-400/10 dark:text-bay-300',
        destructive: 'border-red-800/40 bg-red-800/10 text-red-700',
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
