'use client'

import { useCallback, useRef, useState } from 'react'

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

  const handleFile = useCallback(
    async (file: File) => {
      setPending(true)
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          toast({
            title: 'Upload failed',
            description: 'You must be signed in to upload.',
            variant: 'destructive',
          })
          return
        }

        const storagePath = `${user.id}/${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from(KB_BUCKET_NAME)
          .upload(storagePath, file, { upsert: false })

        if (uploadError) {
          toast({
            title: 'Storage upload failed',
            description: uploadError.message,
            variant: 'destructive',
          })
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
          toast({
            title: 'Upload failed',
            description: result.error ?? 'Unknown error',
            variant: 'destructive',
          })
        }
      } finally {
        setPending(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [toast]
  )

  return (
    <div className="space-y-4">
      <div
        onClick={() => !pending && inputRef.current?.click()}
        className={`border-border/80 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 transition-colors ${
          pending ? 'pointer-events-none opacity-60' : 'hover:border-primary/60'
        }`}
      >
        <input
          id="kb-file"
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
          className="hidden"
        />
        <div className="border-primary/25 bg-primary/5 flex size-12 items-center justify-center rounded-full border">
          <svg
            className="text-primary size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-foreground text-sm font-medium">
            {pending ? 'Extracting, chunking & embedding…' : 'Click to select a file'}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            PDF, Markdown, or plain text (max 25 MB)
          </p>
        </div>
      </div>
    </div>
  )
}
