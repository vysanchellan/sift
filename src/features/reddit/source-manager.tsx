'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

import { createRedditSource, deleteSource, listSources, type SourceListItem } from '@/features/reddit/source-actions'

export function SourceManager() {
  const [sources, setSources] = useState<SourceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', subreddits: '' })
  const { toast } = useToast()

  async function loadSources() {
    setLoading(true)
    try {
      const result = await listSources()
      if (result.ok) {
        setSources(result.sources ?? [])
      } else {
        toast({ title: 'Failed to load sources', description: result.error, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      const result = await createRedditSource(formData)
      if (result.ok) {
        setFormData({ name: '', subreddits: '' })
        toast({ title: 'Source added', variant: 'success' })
        await loadSources()
      } else {
        toast({ title: 'Failed to add source', description: result.error, variant: 'destructive' })
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(sourceId: string) {
    if (!confirm('Delete this source? This cannot be undone.')) return
    setDeleting(sourceId)
    try {
      const result = await deleteSource(sourceId)
      if (result.ok) {
        toast({ title: 'Source deleted', variant: 'success' })
        await loadSources()
      } else {
        toast({ title: 'Failed to delete', description: result.error, variant: 'destructive' })
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-4" />
          Reddit Sources
        </CardTitle>
        <CardDescription>
          Add subreddits to import discussions from. Each source can track multiple subreddits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-4 p-4 bg-sand-100/50 dark:bg-sand-800/30 rounded-lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-name" className="text-xs font-medium text-sand-600 dark:text-sand-400">
                Source name
              </Label>
              <Input
                id="source-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Programming feeds"
                disabled={creating}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-subreddits" className="text-xs font-medium text-sand-600 dark:text-sand-400">
                Subreddits (comma-separated)
              </Label>
              <Input
                id="source-subreddits"
                value={formData.subreddits}
                onChange={(e) => setFormData({ ...formData, subreddits: e.target.value })}
                placeholder="programming, typescript, rust"
                disabled={creating}
                required
              />
            </div>
          </div>
          <p className="text-xs text-sand-500 dark:text-sand-400">
            Example: <code className="px-1 bg-sand-200 dark:bg-sand-800 rounded">programming, typescript, rust</code> &mdash;
            names are normalized (lowercase, no &ldquo;r/&rdquo; prefix).
          </p>
          <Button type="submit" disabled={creating} className="w-full sm:w-auto">
            {creating ? <Loader2 className="size-4 animate-spin" /> : 'Add source'}
          </Button>
        </form>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-sand-200 dark:bg-sand-800 rounded-lg" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sand-500 dark:text-sand-400">No sources configured yet.</p>
            <p className="text-xs text-sand-500 dark:text-sand-400 mt-1">Add a source above to start importing discussions.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex items-center justify-between gap-4 p-3 bg-sand-100/50 dark:bg-sand-800/30 rounded-lg hover:bg-sand-100 dark:hover:bg-sand-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{source.kind}</Badge>
                    <span className="font-medium truncate">{source.name}</span>
                  </div>
                  <div className="text-sand-500 dark:text-sand-400 text-sm flex flex-wrap gap-2">
                    <span>
                      Subreddits:{' '}
                      {(source.config as Record<string, string[]>)?.subreddits?.map((s) => `r/${s}`).join(', ') ?? '—'}
                    </span>
                    <span className="hidden sm:inline">·</span>
                    <Badge variant={source.isEnabled ? 'default' : 'secondary'}>
                      {source.status}
                    </Badge>
                    {source.lastSyncedAt && (
                      <span className="hidden sm:inline">Last sync: {new Date(source.lastSyncedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(source.id)}
                  disabled={deleting === source.id}
                  className="text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${source.name}`}
                >
                  {deleting === source.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}