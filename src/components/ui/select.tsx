'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

function Select<T>({ children, ...props }: SelectPrimitive.Root.Props<T>) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
}

function SelectLabel({ className, ...props }: SelectPrimitive.Label.Props) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', className)}
      {...props}
    />
  )
}

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'border-border bg-background data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 flex h-8 w-full items-center justify-between gap-2 rounded-md border px-2 text-sm whitespace-nowrap outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
        <ChevronDown className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({ className, placeholder, children, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn('data-[placeholder]:text-muted-foreground truncate', className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Value>
  )
}

function SelectPopup({ className, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Backdrop className="bg-foreground/10 fixed inset-0 z-50 transition-opacity duration-150" />
      <SelectPrimitive.Positioner sideOffset={4} className="z-50 w-max min-w-[var(--anchor-width)]">
        <SelectPrimitive.Popup
          data-slot="select-popup"
          className={cn(
            'bg-card text-card-foreground rounded-lg border p-1 shadow-lg outline-none',
            className
          )}
          {...props}
        />
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectList({ className, ...props }: SelectPrimitive.List.Props) {
  return <SelectPrimitive.List className={cn('max-h-64 overflow-y-auto', className)} {...props} />
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[highlighted]:bg-muted text-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1 truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectLabel, SelectTrigger, SelectValue, SelectPopup, SelectList, SelectItem }
