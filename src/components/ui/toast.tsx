'use client'

import { Toaster, toast } from 'sonner'

export interface ToastOptions {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  variant?: 'default' | 'destructive' | 'success'
}

export function useToast() {
  return {
    toast: ({ title, description, action, duration, variant = 'default' }: ToastOptions) => {
      switch (variant) {
        case 'destructive':
          return toast.error(title ?? '', {
            description,
            action:
              action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            duration,
          })
        case 'success':
          return toast.success(title ?? '', {
            description,
            action:
              action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            duration,
          })
        default:
          return toast(title ?? '', {
            description,
            action:
              action
                ? {
                    label: action.label,
                    onClick: action.onClick,
                  }
                : undefined,
            duration,
          })
      }
    },
    dismiss: toast.dismiss,
    promise: <T,>(
      promise: Promise<T>,
      msgs: { loading: string; success: string | ((data: T) => string); error: string | ((err: Error) => string) }
    ) => {
      return toast.promise(promise, msgs)
    },
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'group',
            title: 'font-medium',
            description: 'text-muted-foreground',
            closeButton: 'text-muted-foreground',
            actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
            cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
          },
        }}
      />
    </>
  )
}

export { ToastProvider as ToasterProvider }