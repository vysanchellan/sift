'use client'

import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

import { uploadKnowledgeBaseDocument } from '../actions'
import { KB_BUCKET_NAME } from '../constants'

const ACCEPTED = '.pdf,.md,.markdown,.txt,.text,application/pdf,text/markdown,text/plain'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeBaseUploadForm() {
  const [pending, setPending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = useCallback(async (file: File) => {
    setPending(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: 'Upload failed', description: 'You must be signed in to upload.', variant: 'destructive' })
        return
      }

      const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from(KB_BUCKET_NAME)
        .upload(storagePath, file, { upsert: false })

      if (uploadError) {
        toast({ title: 'Storage upload failed', description: uploadError.message, variant: 'destructive' })
        return
      }

      const result = await uploadKnowledgeBaseDocument({
        storagePath,
        fileName: file.name,
        mimeType: file.type || 'text/plain',
        sizeBytes: file.size,
      })

      if (result.ok) {
        toast({
          title: 'Document uploaded',
          description: `${result.fileName} — ${result.chunkCount ?? 0} chunks, ${formatBytes(result.charCount ?? 0)} of text.`,
          variant: 'success',
        })
      } else {
        toast({ title: 'Upload failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [toast])

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="kb-file">Upload a document</Label>
        <Input
          id="kb-file"
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <p className="text-muted-foreground text-xs">
          PDF, Markdown, or plain text (max 25 MB). Text is extracted, chunked, embedded, and stored
          in your knowledge base.
        </p>
      </div>

      {pending && (
        <p className="text-muted-foreground text-sm">
          Extracting and embedding… this can take a moment.
        </p>
      )}

      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
      </div>
    </div>
  )
}