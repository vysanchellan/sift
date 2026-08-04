import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Cluster, Course, CourseDiscussionMatch, CourseLesson, CourseSection } from '@/types'

/**
 * Server functions for reading course-mapper state: the course structure
 * (courses → sections → lessons), the discussions matched to each section, and
 * the recurring discussion clusters (Prompt 7) that no section currently
 * answers — candidate "new lesson" ideas. Never throws; errors are returned on
 * the result so callers can render them inline.
 */

export interface CourseSectionWithMatches extends CourseSection {
  lessons: CourseLesson[]
  matches: Array<
    CourseDiscussionMatch & { discussion?: { id: string; title: string; summary: string | null } }
  >
}

export interface CourseWithSections extends Course {
  sections: CourseSectionWithMatches[]
}

export interface ListCoursesResult {
  courses: CourseWithSections[]
  error?: string
}

export interface LessonIdea {
  cluster: Cluster
  memberCount: number
}

export interface ListLessonIdeasResult {
  ideas: LessonIdea[]
  error?: string
}

export async function listCoursesWithSections(userId: string): Promise<ListCoursesResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('courses')
    .select(
      `
      *,
      course_sections(
        *,
        course_lessons(*),
        course_discussion_matches(*, discussions(id, title, summary))
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { courses: [], error: `Could not load courses: ${error.message}` }
  }

  const courses = (data ?? []).map((course) => ({
    ...course,
    sections: (course.course_sections ?? [])
      .map((section) => ({
        ...section,
        lessons: (section.course_lessons ?? []).sort((a, b) => a.position - b.position),
        matches: (section.course_discussion_matches ?? [])
          .filter((m) => m.discussion_id)
          .map((m) => ({
            ...m,
            discussion:
              (m.discussions as CourseSectionWithMatches['matches'][number]['discussion']) ??
              undefined,
          })),
      }))
      .sort((a, b) => a.position - b.position),
  }))

  return { courses }
}

/**
 * Recurring discussion clusters that no course section answers. A cluster
 * counts as answered when any of its member discussions is matched to a
 * section in `course_discussion_matches`; the remaining clusters are candidate
 * new-lesson ideas.
 */
export async function listUnmatchedLessonIdeas(userId: string): Promise<ListLessonIdeasResult> {
  const supabase = createAdminClient()

  const { data: clusters, error: clustersError } = await supabase
    .from('clusters')
    .select('*')
    .eq('user_id', userId)
  if (clustersError) {
    return { ideas: [], error: `Could not load clusters: ${clustersError.message}` }
  }

  const { data: matches, error: matchesError } = await supabase
    .from('course_discussion_matches')
    .select('discussion_id')
    .eq('user_id', userId)
  if (matchesError) {
    return { ideas: [], error: `Could not load course matches: ${matchesError.message}` }
  }

  const matchedIds = new Set(
    (matches ?? []).map((m) => m.discussion_id).filter((id): id is string => Boolean(id))
  )

  const ideas: LessonIdea[] = (clusters ?? [])
    .filter((cluster) => !cluster.discussion_ids.some((id) => matchedIds.has(id)))
    .map((cluster) => ({
      cluster,
      memberCount: cluster.discussion_ids.length,
    }))
    .sort((a, b) => b.memberCount - a.memberCount)

  return { ideas }
}
