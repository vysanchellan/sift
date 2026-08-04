import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Discussion, DiscussionCoverage } from '@/types'

/**
 * Server functions for reading knowledge-base state: uploaded documents and
 * enriched discussions with their semantic coverage verdict. Never throws;
 * errors are returned on the result so callers can render them inline.
 */

export interface DiscussionWithCoverage {
  discussion: Discussion
  coverage: DiscussionCoverage | null
}

export interface ListDocumentsResult {
  documents: Array<{
    id: string
    file_name: string
    mime_type: string
    size_bytes: number
    status: string
    char_count: number | null
    chunk_count: number | null
    error: string | null
    created_at: string
  }>
  error?: string
}

export async function listKnowledgeBaseDocuments(userId: string): Promise<ListDocumentsResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('knowledge_base_documents')
    .select(
      'id, file_name, mime_type, size_bytes, status, char_count, chunk_count, error, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { documents: [], error: `Could not load documents: ${error.message}` }
  }

  return { documents: (data ?? []) as ListDocumentsResult['documents'] }
}

export async function listEnrichedDiscussionsWithCoverage(
  userId: string,
  options: { limit?: number } = {}
): Promise<{ items: DiscussionWithCoverage[]; error?: string }> {
  const supabase = createAdminClient()
  const limit = Math.min(200, Math.max(1, options.limit ?? 100))

  const { data, error } = await supabase
    .from('discussions')
    .select(
      '*, discussion_coverage(id, status, best_similarity, matched_content, matched_document_id, updated_at)',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .not('summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { items: [], error: `Could not load discussions: ${error.message}` }
  }

  const items: DiscussionWithCoverage[] = (data ?? []).map((row) => ({
    discussion: row as unknown as Discussion,
    coverage: (row.discussion_coverage as DiscussionCoverage | null) ?? null,
  }))

  return { items }
}
