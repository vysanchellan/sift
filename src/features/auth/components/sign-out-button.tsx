'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { signOut } from '../actions'

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOut()
        })
      }
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
