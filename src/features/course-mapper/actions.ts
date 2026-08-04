'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

import { parseCsvOutline, parseMarkdownOutline, type CourseOutline } from './parse'
import { embedCourseContentForUser, matchDiscussionsToCourseForUser } from './pipeline'

export interface CourseActionResult<T = undefined> {
  ok: boolean
  data?: T
  error?: string
  errorCode?: 'unauthenticated' | 'validation'
}

export interface RefreshMatchesResult {
  ok: boolean
  embeddedSections?: number
  embeddedLessons?: number
  matched?: number
  error?: string
  errorCode?: 'unauthenticated'
}

export interface CreateCourseResult {
  ok: boolean
  courseId?: string
  error?: string
  errorCode?: 'unauthenticated' | 'validation'
}

export interface CreateSectionResult {
  ok: boolean
  sectionId?: string
  error?: string
  errorCode?: 'unauthenticated' | 'validation'
}

export interface CreateLessonResult {
  ok: boolean
  lessonId?: string
  error?: string
  errorCode?: 'unauthenticated' | 'validation'
}

function validateTitle(title: string, field = 'title'): string | null {
  const trimmed = title.trim()
  if (!trimmed) return `${field} is required.`
  if (trimmed.length > 200) return `${field} is too long (max 200 characters).`
  return null
}

async function getAuthedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { supabase, user: null as null, authError: true }
  }
  return { supabase, user, authError: false }
}

/**
 * Creates a course and immediately embeds its (empty) structure.
 */
export async function createCourse(input: {
  title: string
  description?: string
}): Promise<CreateCourseResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const titleError = validateTitle(input.title)
  if (titleError) return { ok: false, error: titleError, errorCode: 'validation' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('courses')
    .insert({ user_id: user.id, title: input.title.trim(), description: input.description?.trim() })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: `Could not create course: ${error?.message}` }
  }

  revalidatePath('/dashboard/courses')
  return { ok: true, courseId: data.id }
}

export async function createCourseSection(input: {
  courseId: string
  title: string
  description?: string
}): Promise<CreateSectionResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const titleError = validateTitle(input.title)
  if (titleError) return { ok: false, error: titleError, errorCode: 'validation' }

  const supabase = await createClient()

  // Verify the course belongs to the user before inserting.
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', input.courseId)
    .eq('user_id', user.id)
    .single()
  if (!course) {
    return { ok: false, error: 'Course not found.', errorCode: 'validation' }
  }

  const { count } = await supabase
    .from('course_sections')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', input.courseId)
  const position = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('course_sections')
    .insert({
      user_id: user.id,
      course_id: input.courseId,
      title: input.title.trim(),
      description: input.description?.trim(),
      position,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: `Could not create section: ${error?.message}` }
  }

  revalidatePath('/dashboard/courses')
  return { ok: true, sectionId: data.id }
}

export async function createCourseLesson(input: {
  sectionId: string
  title: string
  content?: string
}): Promise<CreateLessonResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  const titleError = validateTitle(input.title)
  if (titleError) return { ok: false, error: titleError, errorCode: 'validation' }

  const supabase = await createClient()

  // Verify the section belongs to the user.
  const { data: section } = await supabase
    .from('course_sections')
    .select('id, course_id')
    .eq('id', input.sectionId)
    .eq('user_id', user.id)
    .single()
  if (!section) {
    return { ok: false, error: 'Section not found.', errorCode: 'validation' }
  }

  const { count } = await supabase
    .from('course_lessons')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', input.sectionId)
  const position = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('course_lessons')
    .insert({
      user_id: user.id,
      course_id: section.course_id,
      section_id: input.sectionId,
      title: input.title.trim(),
      content: input.content?.trim(),
      position,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, error: `Could not create lesson: ${error?.message}` }
  }

  revalidatePath('/dashboard/courses')
  return { ok: true, lessonId: data.id }
}

/**
 * Imports a course outline (markdown or CSV), creating the course, its
 * sections, and lessons in one pass, then embeds the content.
 */
export async function importCourseOutline(input: {
  format: 'markdown' | 'csv'
  content: string
  title?: string
}): Promise<CourseActionResult<{ courseId: string; sections: number; lessons: number }>> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  let outline: CourseOutline
  try {
    outline =
      input.format === 'csv'
        ? parseCsvOutline(input.content, input.title?.trim() || 'Imported course')
        : parseMarkdownOutline(input.content)
  } catch (parseError) {
    return {
      ok: false,
      error: `Could not parse outline: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      errorCode: 'validation',
    }
  }

  const title = input.title?.trim() || outline.title.trim() || 'Imported course'
  const titleError = validateTitle(title, 'Course title')
  if (titleError) return { ok: false, error: titleError, errorCode: 'validation' }

  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .insert({ user_id: user.id, title, description: outline.description })
    .select('id')
    .single()
  if (courseError || !course) {
    return { ok: false, error: `Could not create course: ${courseError?.message}` }
  }

  let sectionCount = 0
  let lessonCount = 0

  for (const [sectionIndex, section] of outline.sections.entries()) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from('course_sections')
      .insert({
        user_id: user.id,
        course_id: course.id,
        title: section.title,
        description: section.description,
        position: sectionIndex + 1,
      })
      .select('id')
      .single()
    if (sectionError) {
      return {
        ok: false,
        error: `Could not create section "${section.title}": ${sectionError.message}`,
      }
    }
    sectionCount++

    for (const [lessonIndex, lesson] of section.lessons.entries()) {
      const { error: lessonError } = await supabase.from('course_lessons').insert({
        user_id: user.id,
        course_id: course.id,
        section_id: sectionRow.id,
        title: lesson.title,
        content: lesson.content,
        position: lessonIndex + 1,
      })
      if (lessonError) {
        return {
          ok: false,
          error: `Could not create lesson "${lesson.title}": ${lessonError.message}`,
        }
      }
      lessonCount++
    }
  }

  const embedResult = await embedCourseContentForUser(user.id)
  if (embedResult.failed > 0) {
    return {
      ok: true,
      data: { courseId: course.id, sections: sectionCount, lessons: lessonCount },
      error: `Imported, but ${embedResult.failed} embedding(s) failed.`,
    }
  }

  revalidatePath('/dashboard/courses')
  return { ok: true, data: { courseId: course.id, sections: sectionCount, lessons: lessonCount } }
}

/**
 * Embeds all course content and recomputes discussion matches for the user.
 */
export async function refreshCourseMatches(): Promise<RefreshMatchesResult> {
  const { user, authError } = await getAuthedUser()
  if (authError || !user) {
    return { ok: false, error: 'You must be signed in.', errorCode: 'unauthenticated' }
  }

  try {
    const embedResult = await embedCourseContentForUser(user.id)
    const matchResult = await matchDiscussionsToCourseForUser(user.id)
    revalidatePath('/dashboard/courses')
    return {
      ok: true,
      embeddedSections: embedResult.sections,
      embeddedLessons: embedResult.lessons,
      matched: matchResult.matched,
    }
  } catch (runError) {
    return {
      ok: false,
      error: runError instanceof Error ? runError.message : String(runError),
    }
  }
}
