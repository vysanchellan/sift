/**
 * Pure parsers for importing a course outline from Markdown or CSV. Course
 * structure is courses → sections → lessons, so both formats describe one
 * course. Pure and deterministic so it can be unit-tested with hand-computed
 * expectations.
 *
 * Markdown format:
 *   # Course title
 *   Course description (any paragraph before the first ##)
 *
 *   ## Section one
 *   Section description (paragraphs before the first ### in the section)
 *
 *   ### Lesson one
 *   Lesson content (paragraphs until the next heading)
 *
 * CSV format (header row `section,title,content`, then one row per lesson):
 *   section,title,content
 *   Go Basics,What is Go,"Install the toolchain and write hello world."
 * Rows with the same `section` value group into one section; each row is a
 * lesson. The course title is supplied by the caller.
 */

export interface LessonOutline {
  title: string
  content?: string
}

export interface SectionOutline {
  title: string
  description?: string
  lessons: LessonOutline[]
}

export interface CourseOutline {
  title: string
  description?: string
  sections: SectionOutline[]
}

const MARKDOWN_H1 = /^#\s+(.*)$/
const MARKDOWN_H2 = /^##\s+(.*)$/
const MARKDOWN_H3 = /^###\s+(.*)$/

function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join(' ')
}

/**
 * Parse a markdown course outline into a `CourseOutline`. Blank lines separate
 * paragraphs; heading levels define course / section / lesson boundaries. Any
 * non-heading text before the first section becomes the course description.
 */
export function parseMarkdownOutline(markdown: string): CourseOutline {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const outline: CourseOutline = { title: '', sections: [] }
  let currentSection: SectionOutline | null = null
  let currentLesson: LessonOutline | null = null
  const courseBuffer: string[] = []
  let sectionBuffer: string[] = []
  let lessonBuffer: string[] = []

  function flushSection() {
    if (currentLesson) {
      currentLesson.content = joinParagraphs(lessonBuffer) || undefined
      currentSection!.lessons.push(currentLesson)
      currentLesson = null
      lessonBuffer = []
    }
    if (currentSection) {
      currentSection.description = joinParagraphs(sectionBuffer) || undefined
      outline.sections.push(currentSection)
      currentSection = null
      sectionBuffer = []
    }
  }

  for (const line of lines) {
    const h1 = line.match(MARKDOWN_H1)
    if (h1) {
      flushSection()
      if (!outline.title) outline.title = h1[1].trim()
      continue
    }

    const h2 = line.match(MARKDOWN_H2)
    if (h2) {
      flushSection()
      currentSection = { title: h2[1].trim(), lessons: [] }
      continue
    }

    const h3 = line.match(MARKDOWN_H3)
    if (h3) {
      if (currentLesson) {
        currentLesson.content = joinParagraphs(lessonBuffer) || undefined
        currentSection!.lessons.push(currentLesson)
      }
      currentLesson = { title: h3[1].trim() }
      lessonBuffer = []
      continue
    }

    if (line.trim()) {
      if (currentLesson) lessonBuffer.push(line.trim())
      else if (currentSection) sectionBuffer.push(line.trim())
      else courseBuffer.push(line.trim())
    }
  }

  flushSection()
  outline.description = joinParagraphs(courseBuffer) || undefined
  return outline
}

/**
 * Parse a CSV course outline. Expects a header row `section,title,content`;
 * every subsequent row is a lesson belonging to the section named by the
 * `section` column (sections appear in first-seen order).
 */
export function parseCsvOutline(csv: string, fallbackTitle = 'Imported course'): CourseOutline {
  const lines = csv
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const outline: CourseOutline = { title: fallbackTitle, sections: [] }
  let currentSection: SectionOutline | null = null

  for (const line of lines) {
    const fields = parseCsvLine(line)
    if (fields.length < 1) continue
    // Skip a header row that spells out the column names.
    const [sectionName, lessonTitle, lessonContent] = fields
    if (sectionName.toLowerCase() === 'section' && lessonTitle?.toLowerCase() === 'title') {
      continue
    }

    if (!currentSection || currentSection.title !== sectionName) {
      currentSection = { title: sectionName, lessons: [] }
      outline.sections.push(currentSection)
    }

    currentSection.lessons.push({
      title: lessonTitle || '(untitled lesson)',
      content: lessonContent || undefined,
    })
  }

  return outline
}

/** Parse a single CSV line honoring double-quoted fields. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}
