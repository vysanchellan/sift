'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { RefreshCw } from 'lucide-react'

import { importNow, type ImportNowResult } from './actions'

function formatResults(results: ImportNowResult['results']) {
  if (!results || results.length === 0) {
    return 'No Reddit sources found. Add one to get started.'
  }
  return results
    .map((result) => {
      const subreddits = result.subreddits.map((sub) => `r/${sub}`).join(', ')
      if (result.error) {
        return `${result.sourceName}: ${result.error}`
      }
      if (!result.attempted) {
        return `${result.sourceName}: already synced recently, skipped.`
      }
      return `${result.sourceName} (${subreddits}): imported ${result.imported}, deduped ${result.deduped}.`
    })
    .join(' ')
}

export function ImportNowButton() {
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleImport() {
    setPending(true)
    try {
      const result = await importNow()
      if (result.ok) {
        toast({
          title: 'Import complete',
          description: formatResults(result.results),
          variant: 'success',
        })
      } else {
        toast({
          title: 'Import failed',
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
      <Button type="button" size="lg" onClick={handleImport} disabled={pending}>
        <RefreshCw className={pending ? 'animate-spin' : undefined} />
        {pending ? 'Importing…' : 'Import Reddit posts'}
      </Button>
    </div>
  )
}
