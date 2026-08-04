import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { AIProvider } from '@/server/providers'
import type { Discussion } from '@/types'

import { chunkText, DEFAULT_CHUNK_MAX_CHARS, DEFAULT_CHUNK_OVERLAP_CHARS } from './chunk'
import { classifyCoverage } from './coverage'
import { extractText } from './extract'
import { getKnowledgeBaseEmbeddingProvider } from './provider'

/**
 * Knowledge-base pipeline. Two server-only operations:
 *
 *  1. `ingestDocumentForUser` — downloads an uploaded file from Storage,
 *     extracts its text, chunks it, embeds every chunk via the active embedding
 *     provider, and stores chunks + embeddings in `knowledge_base_embeddings`
 *     (with a `knowledge_base_documents` record tracking status).
 *
 *  2. `compareDiscussionsToKnowledgeBase` — for each enriched discussion,
 *     embeds the discussion text with the same provider and finds the closest
 *     KB chunks via the `match_knowledge_base` RPC, classifying each as
 *     answered / partially_covered / gap into `discussion_coverage`.
 *
 * The concrete embedding provider is config-swappable (`KB_EMBEDDING_PROVIDER`)
 * and callers only depend on the AIProvider interface.
 */

export const KB_BUCKET = 'knowledge-base'
export const KB_CHUNK_MAX_CHARS = DEFAULT_CHUNK_MAX_CHARS
export const KB_CHUNK_OVERLAP_CHARS = DEFAULT_CHUNK_OVERLAP_CHARS
export const KB_EMBED_GAP_MS = 250

export interface IngestDocumentResult {
  documentId: string | null
  fileName: string
  charCount: number
  chunkCount: number
  error?: string
}

export interface CompareRunResult {
  considered: number
  classified: number
  failed: number
  errors: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export async function ingestDocumentForUser(
  userId: string,
  input: { storagePath: string; fileName: string; mimeType: string },
  options: { provider?: AIProvider; signal?: AbortSignal } = {}
): Promise<IngestDocumentResult> {
  const supabase = createAdminClient()
  const provider = options.provider ?? getKnowledgeBaseEmbeddingProvider()
  const result: IngestDocumentResult = {
    documentId: null,
    fileName: input.fileName,
    charCount: 0,
    chunkCount: 0,
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(KB_BUCKET)
    .download(input.storagePath)
  if (downloadError || !file) {
    return {
      ...result,
      error: `Could not download file from storage: ${downloadError?.message ?? 'missing file'}`,
    }
  }

  const buffer = new Uint8Array(await file.arrayBuffer())

  let extracted
  try {
    extracted = await extractText(buffer, input.mimeType)
  } catch (extractError) {
    return {
      ...result,
      error: extractError instanceof Error ? extractError.message : String(extractError),
    }
  }

  const chunks = chunkText(extracted.text, {
    maxChars: KB_CHUNK_MAX_CHARS,
    overlapChars: KB_CHUNK_OVERLAP_CHARS,
  })
  if (chunks.length === 0) {
    return { ...result, error: 'No text could be extracted from the file.' }
  }
  result.charCount = extracted.charCount
  result.chunkCount = chunks.length

  const { data: documentRow, error: insertDocError } = await supabase
    .from('knowledge_base_documents')
    .insert({
      user_id: userId,
      file_name: input.fileName,
      mime_type: extracted.mimeType,
      storage_path: input.storagePath,
      status: 'processing',
    })
    .select('id')
    .single()

  if (insertDocError || !documentRow) {
    return {
      ...result,
      error: `Could not create document record: ${insertDocError?.message ?? 'missing id'}`,
    }
  }
  result.documentId = documentRow.id

  const embeddings: Array<{
    user_id: string
    document_id: string
    chunk_index: number
    content: string
    provider: string
    model: string
    embedding: string
  }> = []

  for (const chunk of chunks) {
    if (options.signal?.aborted) {
      return { ...result, error: 'Aborted during embedding.' }
    }
    try {
      const embedResult = await provider.embed(chunk.content, { signal: options.signal })
      embeddings.push({
        user_id: userId,
        document_id: documentRow.id,
        chunk_index: chunk.index,
        content: chunk.content,
        provider: provider.name,
        model: embedResult.model,
        embedding: vectorLiteral(embedResult.embedding),
      })
      await sleep(KB_EMBED_GAP_MS)
    } catch (embedError) {
      const message = embedError instanceof Error ? embedError.message : String(embedError)
      await supabase
        .from('knowledge_base_documents')
        .update({ status: 'failed', error: message })
        .eq('id', documentRow.id)
      return { ...result, error: `Embedding failed on chunk ${chunk.index}: ${message}` }
    }
  }

  const { error: insertEmbeddingsError } = await supabase
    .from('knowledge_base_embeddings')
    .insert(embeddings)

  if (insertEmbeddingsError) {
    const message = `Could not store embeddings: ${insertEmbeddingsError.message}`
    await supabase
      .from('knowledge_base_documents')
      .update({ status: 'failed', error: message })
      .eq('id', documentRow.id)
    return { ...result, error: message }
  }

  await supabase
    .from('knowledge_base_documents')
    .update({
      status: 'ready',
      char_count: extracted.charCount,
      chunk_count: chunks.length,
      embedding_provider: provider.name,
      embedding_model: embeddings[0]?.model ?? null,
    })
    .eq('id', documentRow.id)

  return result
}

function buildDiscussionText(discussion: Pick<Discussion, 'title' | 'body'>): string {
  return [discussion.title, discussion.body].filter(Boolean).join('\n\n').slice(0, 3000)
}

export async function compareDiscussionsToKnowledgeBase(
  userId: string,
  options: { limit?: number; provider?: AIProvider; signal?: AbortSignal } = {}
): Promise<CompareRunResult> {
  const supabase = createAdminClient()
  const provider = options.provider ?? getKnowledgeBaseEmbeddingProvider()
  const result: CompareRunResult = { considered: 0, classified: 0, failed: 0, errors: [] }

  const { data: discussions, error: loadError } = await supabase
    .from('discussions')
    .select('id, title, body, summary')
    .eq('user_id', userId)
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200)

  if (loadError) {
    throw new Error(`Could not load enriched discussions: ${loadError.message}`)
  }

  const enriched = (discussions ?? []) as Discussion[]
  result.considered = enriched.length

  for (const discussion of enriched) {
    if (options.signal?.aborted) break
    try {
      const embedResult = await provider.embed(buildDiscussionText(discussion), {
        signal: options.signal,
      })
      const { data: matches, error: matchError } = await supabase.rpc('match_knowledge_base', {
        p_user_id: userId,
        p_query_embedding: vectorLiteral(embedResult.embedding),
        p_match_count: 1,
        p_threshold: 0,
        p_provider: provider.name,
      })

      if (matchError) {
        throw new Error(`match_knowledge_base failed: ${matchError.message}`)
      }
      const top = matches?.[0]

      const { status } = classifyCoverage(top?.similarity ?? null)
      const { error: upsertError } = await supabase.from('discussion_coverage').upsert(
        {
          user_id: userId,
          discussion_id: discussion.id,
          status,
          best_similarity: top?.similarity ?? null,
          best_chunk_id: top?.chunk_id ?? null,
          matched_document_id: top?.document_id ?? null,
          matched_content: top?.content ?? null,
        },
        { onConflict: 'discussion_id' }
      )
      if (upsertError) {
        throw new Error(`Could not save coverage: ${upsertError.message}`)
      }
      result.classified++
      await sleep(KB_EMBED_GAP_MS)
    } catch (error) {
      result.failed++
      result.errors.push(
        `${discussion.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return result
}
