import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getKnowledgeBaseEmbeddingProvider } from '@/features/knowledge-base/provider'
import type { AIProvider } from '@/server/providers'
import type { Discussion } from '@/types'

/**
 * Course-mapper pipeline. Two server-only operations:
 *
 *  1. `embedCourseContentForUser` — embeds every course section and lesson
 *     (title + description/content) with the same embedding provider as the
 *     knowledge base and stores the vector on the row.
 *
 *  2. `matchDiscussionsToCourseForUser` — for each enriched discussion, embeds
 *     the discussion text and finds the closest course section/lesson via the
 *     `match_course_content` RPC, storing the best match into
 *     `course_discussion_matches` (unique on discussion_id + course_section_id).
 *     Existing matches for the user are replaced, so removing a section also
 *     clears its matches.
 *
 * The embedding provider is the KB provider (config-swappable, local by
 * default) so discussion and course vectors live in the same space.
 */

export const COURSE_MATCH_THRESHOLD = 0.3
export const COURSE_EMBED_GAP_MS = 250
export const COURSE_MATCH_GAP_MS = 250

export interface EmbedCourseRunResult {
  sections: number
  lessons: number
  failed: number
  errors: string[]
}

export interface MatchCourseRunResult {
  considered: number
  matched: number
  failed: number
  errors: string[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

function buildCourseText(title: string, body: string | null | undefined): string {
  return [title, body].filter(Boolean).join('\n\n').slice(0, 3000)
}

/**
 * Embed all course sections + lessons for a user. Re-embeds every row (idempotent).
 */
export async function embedCourseContentForUser(
  userId: string,
  options: { provider?: AIProvider; signal?: AbortSignal } = {}
): Promise<EmbedCourseRunResult> {
  const supabase = createAdminClient()
  const provider = options.provider ?? getKnowledgeBaseEmbeddingProvider()
  const result: EmbedCourseRunResult = { sections: 0, lessons: 0, failed: 0, errors: [] }

  const { data: sections, error: sectionsError } = await supabase
    .from('course_sections')
    .select('id, title, description')
    .eq('user_id', userId)
  if (sectionsError) {
    throw new Error(`Could not load course sections: ${sectionsError.message}`)
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from('course_lessons')
    .select('id, title, content')
    .eq('user_id', userId)
  if (lessonsError) {
    throw new Error(`Could not load course lessons: ${lessonsError.message}`)
  }

  for (const section of sections ?? []) {
    if (options.signal?.aborted) return result
    try {
      const embedResult = await provider.embed(
        buildCourseText(section.title, section.description),
        {
          signal: options.signal,
        }
      )
      const { error } = await supabase
        .from('course_sections')
        .update({
          embedding: vectorLiteral(embedResult.embedding),
          embedding_provider: provider.name,
          embedding_model: embedResult.model,
          embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', section.id)
      if (error) throw new Error(`Could not save section embedding: ${error.message}`)
      result.sections++
      await sleep(COURSE_EMBED_GAP_MS)
    } catch (error) {
      result.failed++
      result.errors.push(
        `section ${section.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  for (const lesson of lessons ?? []) {
    if (options.signal?.aborted) return result
    try {
      const embedResult = await provider.embed(buildCourseText(lesson.title, lesson.content), {
        signal: options.signal,
      })
      const { error } = await supabase
        .from('course_lessons')
        .update({
          embedding: vectorLiteral(embedResult.embedding),
          embedding_provider: provider.name,
          embedding_model: embedResult.model,
          embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id)
      if (error) throw new Error(`Could not save lesson embedding: ${error.message}`)
      result.lessons++
      await sleep(COURSE_EMBED_GAP_MS)
    } catch (error) {
      result.failed++
      result.errors.push(
        `lesson ${lesson.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return result
}

function buildDiscussionText(discussion: Pick<Discussion, 'title' | 'body'>): string {
  return [discussion.title, discussion.body].filter(Boolean).join('\n\n').slice(0, 3000)
}

export interface CourseMatchInput {
  target_type: string
  course_id: string
  section_id: string
  lesson_id: string | null
  title: string
  similarity: number
}

/**
 * For each enriched discussion, find the closest course section/lesson and
 * store it in `course_discussion_matches`. Existing matches for the user are
 * deleted first (recompute).
 */
export async function matchDiscussionsToCourseForUser(
  userId: string,
  options: { limit?: number; provider?: AIProvider; signal?: AbortSignal } = {}
): Promise<MatchCourseRunResult> {
  const supabase = createAdminClient()
  const provider = options.provider ?? getKnowledgeBaseEmbeddingProvider()
  const result: MatchCourseRunResult = { considered: 0, matched: 0, failed: 0, errors: [] }

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
  if (enriched.length === 0) return result

  await supabase.from('course_discussion_matches').delete().eq('user_id', userId)

  const rows: Array<{
    user_id: string
    course_section_id: string
    course_lesson_id: string | null
    discussion_id: string
    reason: string | null
    score: number
  }> = []

  for (const discussion of enriched) {
    if (options.signal?.aborted) break
    try {
      const embedResult = await provider.embed(buildDiscussionText(discussion), {
        signal: options.signal,
      })
      const { data: matches, error: matchError } = await supabase.rpc('match_course_content', {
        p_user_id: userId,
        p_query_embedding: vectorLiteral(embedResult.embedding),
        p_match_count: 1,
        p_threshold: COURSE_MATCH_THRESHOLD,
        p_provider: provider.name,
      })

      if (matchError) {
        throw new Error(`match_course_content failed: ${matchError.message}`)
      }
      const top = matches?.[0] as CourseMatchInput | undefined
      if (!top) continue

      rows.push({
        user_id: userId,
        course_section_id: top.section_id,
        course_lesson_id: top.lesson_id ?? null,
        discussion_id: discussion.id,
        reason:
          top.target_type === 'lesson'
            ? `Matched lesson "${top.title}"`
            : `Matched section "${top.title}"`,
        score: Math.round(Number(top.similarity) * 10000) / 10000,
      })
      result.matched++
      await sleep(COURSE_MATCH_GAP_MS)
    } catch (error) {
      result.failed++
      result.errors.push(
        `${discussion.id}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (rows.length > 0) {
    // The delete above guarantees no existing (discussion_id, course_section_id)
    // pairs, and each discussion contributes at most one row, so a plain insert
    // is safe (the partial unique index guards against duplicates).
    const { error: insertError } = await supabase.from('course_discussion_matches').insert(rows)
    if (insertError) {
      throw new Error(`Could not save course matches: ${insertError.message}`)
    }
  }

  return result
}
