'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

import { refreshCourseMatches } from '../actions'

export function RefreshCourseMatchesButton() {
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleRefresh() {
    setPending(true)
    try {
      const result = await refreshCourseMatches()
      if (result.ok) {
        toast({
          title: 'Matches refreshed',
          description: `Embedded ${result.embeddedSections ?? 0} section(s) and ${result.embeddedLessons ?? 0} lesson(s); matched ${result.matched ?? 0} discussion(s).`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Refresh failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleRefresh} disabled={pending} size="sm" variant="outline">
        {pending ? 'Embedding and matching…' : 'Embed course content + match discussions'}
      </Button>
    </div>
  )
}
