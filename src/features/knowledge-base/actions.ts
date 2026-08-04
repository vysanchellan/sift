'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

import { compareDiscussionsToKnowledgeBase, ingestDocumentForUser } from './pipeline'

export interface UploadDocumentResult {
  ok: boolean
  documentId?: string | null
  fileName?: string
  charCount?: number
  chunkCount?: number
  error?: string
  errorCode?: 'unauthenticated' | 'unsupported-type'
}

export interface CompareCoverageResult {
  ok: boolean
  considered?: number
  classified?: number
  failed?: number
  error?: string
  errorCode?: 'unauthenticated'
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['.pdf', '.md', '.markdown', '.txt', '.text'] as const

/**
 * Records an uploaded document (already in Storage under the user's folder)
 * and runs the ingest pipeline: extract → chunk → embed → store.
 */
export async function uploadKnowledgeBaseDocument(input: {
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
}): Promise<UploadDocumentResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, error: 'You must be signed in to upload.', errorCode: 'unauthenticated' }
  }

  const storagePath = input.storagePath ?? ''
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'File was not uploaded into your storage folder.' }
  }
  if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'File is larger than 25 MB.' }
  }
  const lower = input.fileName.toLowerCase()
  const supported = SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
  if (!supported) {
    return {
      ok: false,
      error: 'Unsupported file type. Upload a PDF, Markdown, or plain-text file.',
      errorCode: 'unsupported-type',
    }
  }

  const result = await ingestDocumentForUser(user.id, {
    storagePath,
    fileName: input.fileName,
    mimeType: input.mimeType,
  })

  if (result.error) {
    return {
      ok: false,
      fileName: result.fileName,
      charCount: result.charCount,
      chunkCount: result.chunkCount,
      error: result.error,
    }
  }

  revalidatePath('/dashboard/knowledge-base')
  return {
    ok: true,
    documentId: result.documentId,
    fileName: result.fileName,
    charCount: result.charCount,
    chunkCount: result.chunkCount,
  }
}

/**
 * (Re)computes the semantic coverage verdict for every enriched discussion and
 * stores it in `discussion_coverage`.
 */
export async function refreshKnowledgeBaseCoverage(): Promise<CompareCoverageResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  try {
    const result = await compareDiscussionsToKnowledgeBase(user.id)
    revalidatePath('/dashboard/knowledge-base')
    return {
      ok: true,
      considered: result.considered,
      classified: result.classified,
      failed: result.failed,
    }
  } catch (runError) {
    return {
      ok: false,
      error: runError instanceof Error ? runError.message : String(runError),
    }
  }
}
