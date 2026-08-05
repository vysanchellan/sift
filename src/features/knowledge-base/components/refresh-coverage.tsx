'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

import { refreshKnowledgeBaseCoverage } from '../actions'

export function RefreshCoverageButton() {
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleRefresh() {
    setPending(true)
    try {
      const result = await refreshKnowledgeBaseCoverage()
      if (result.ok) {
        toast({
          title: 'Coverage refreshed',
          description: `Compared ${result.classified ?? 0} discussion(s) (${result.failed ?? 0} failed).`,
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
        {pending ? 'Comparing…' : 'Compare discussions against KB'}
      </Button>
    </div>
  )
}
