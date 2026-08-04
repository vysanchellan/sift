'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

import { importCourseOutline } from '../actions'

type Format = 'markdown' | 'csv'

const PLACEHOLDERS: Record<Format, string> = {
  markdown: [
    '# Go Concurrency',
    'Learn Go concurrency from scratch.',
    '',
    '## Channels',
    '',
    '### Buffered channels',
    'Channels with a capacity decouple send and receive.',
    '',
    '### Select statements',
    'Wait on multiple channel operations.',
  ].join('\n'),
  csv: 'section,title,content\nChannels,Buffered channels,Capacity decouples send and receive.\nChannels,Select statements,Wait on multiple operations.',
}

export function CourseImportForm() {
  const [format, setFormat] = useState<Format>('markdown')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(PLACEHOLDERS.markdown)
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await importCourseOutline({ format, content, title })
      if (!result.ok) {
        toast({ title: 'Import failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      } else {
        toast({
          title: 'Course imported',
          description: `Imported course with ${result.data?.sections ?? 0} section(s) and ${result.data?.lessons ?? 0} lesson(s).`,
          variant: 'success',
        })
      }
    } finally {
      setPending(false)
    }
  }

  function switchFormat(next: Format) {
    setFormat(next)
    setContent(PLACEHOLDERS[next])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {(['markdown', 'csv'] as const).map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={format === option ? 'default' : 'outline'}
            onClick={() => switchFormat(option)}
          >
            {option === 'markdown' ? 'Markdown' : 'CSV'}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="import-title">Course title (optional)</Label>
        <Input
          id="import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Defaults to the outline's # title"
          disabled={pending}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="import-content">
          {format === 'markdown'
            ? 'Course outline (markdown)'
            : 'Course outline (CSV: section,title,content)'}
        </Label>
        <textarea
          id="import-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-40 w-full rounded-lg border bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none focus-visible:ring-3"
          disabled={pending}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Importing…' : 'Import course'}
        </Button>
      </div>
    </form>
  )
}