import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CourseImportForm } from '@/features/course-mapper/components/course-import-form'
import {
  CourseForm,
  LessonForm,
  SectionForm,
} from '@/features/course-mapper/components/course-forms'
import { RefreshCourseMatchesButton } from '@/features/course-mapper/components/refresh-matches'
import { listCoursesWithSections, listUnmatchedLessonIdeas } from '@/features/course-mapper/queries'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function Similarity({ score }: { score: number | null }) {
  if (score == null) return null
  const pct = (Number(score) * 100).toFixed(0)
  const tone =
    Number(score) >= 0.5
      ? 'border-green-600/30 bg-green-600/10 text-green-700'
      : Number(score) >= 0.3
        ? 'border-amber-600/30 bg-amber-600/10 text-amber-700'
        : 'border-red-600/30 bg-red-600/10 text-red-700'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {pct}%
    </span>
  )
}

export default async function CourseMapperPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <p className="text-muted-foreground">Sign in to view your course mapper.</p>
  }

  const [coursesResult, ideasResult] = await Promise.all([
    listCoursesWithSections(user.id),
    listUnmatchedLessonIdeas(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Course mapper</h1>
        <p className="text-muted-foreground">
          Define courses as sections and lessons, then match your discussions against them. Sections
          that already answer a discussion are shown inline; unmatched recurring clusters become
          candidate new lessons.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New course</CardTitle>
            <CardDescription>
              Start from a blank course, or import a Markdown/CSV outline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CourseForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import outline</CardTitle>
            <CardDescription>
              Paste a Markdown course outline (# / ## / ### headings) or a CSV
              (section,title,content).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseImportForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match course content to discussions</CardTitle>
          <CardDescription>
            Embeds every section and lesson, then finds the closest section/lesson for each enriched
            discussion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RefreshCourseMatchesButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Sections with the discussions they already answer.</CardDescription>
        </CardHeader>
        <CardContent>
          {coursesResult.error && <p className="text-destructive text-sm">{coursesResult.error}</p>}
          {coursesResult.courses.length === 0 ? (
            <p className="text-muted-foreground">
              No courses yet. Create one or import an outline.
            </p>
          ) : (
            <ul className="space-y-6">
              {coursesResult.courses.map((course) => (
                <li key={course.id} className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{course.title}</h3>
                    {course.description && (
                      <p className="text-muted-foreground text-sm">{course.description}</p>
                    )}
                  </div>
                  <ul className="space-y-4 pl-4">
                    {course.sections.length === 0 && (
                      <li className="text-muted-foreground text-sm">
                        No sections yet. Add one below.
                      </li>
                    )}
                    {course.sections.map((section) => (
                      <li key={section.id} className="border-l pl-3">
                        <div>
                          <h4 className="font-medium">{section.title}</h4>
                          {section.description && (
                            <p className="text-muted-foreground text-sm">{section.description}</p>
                          )}
                        </div>

                        <ul className="mt-1 space-y-0.5">
                          {section.lessons.map((lesson) => (
                            <li key={lesson.id} className="text-muted-foreground text-sm">
                              • {lesson.title}
                              {lesson.content && <span> — {lesson.content}</span>}
                            </li>
                          ))}
                        </ul>

                        {section.matches.length > 0 && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-xs font-medium uppercase">
                              Answers {section.matches.length} discussion(s)
                            </p>
                            <ul className="mt-1 space-y-1">
                              {section.matches.map((match) => (
                                <li
                                  key={match.id}
                                  className="bg-muted/30 flex items-center justify-between gap-3 rounded-md border px-2 py-1 text-sm"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">
                                      {match.discussion?.title ?? 'Unknown discussion'}
                                    </p>
                                    {match.reason && (
                                      <p className="text-muted-foreground truncate text-xs">
                                        {match.reason}
                                      </p>
                                    )}
                                  </div>
                                  <Similarity score={match.score} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-2">
                          <SectionForm courseId={course.id} />
                        </div>
                        <div className="mt-2 pl-4">
                          <LessonForm sectionId={section.id} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate new lessons</CardTitle>
          <CardDescription>
            Recurring discussion clusters no course section currently answers. Each could be a new
            lesson.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ideasResult.error && <p className="text-destructive text-sm">{ideasResult.error}</p>}
          {ideasResult.ideas.length === 0 ? (
            <p className="text-muted-foreground">
              No candidate clusters. Run clustering (Prompt 7) and add sections to see ideas.
            </p>
          ) : (
            <ul className="divide-y">
              {ideasResult.ideas.map(({ cluster, memberCount }) => (
                <li key={cluster.id} className="py-2">
                  <p className="font-medium">
                    {cluster.title}{' '}
                    <span className="text-muted-foreground text-xs font-normal">
                      · {memberCount} discussion(s)
                    </span>
                  </p>
                  {cluster.summary && (
                    <p className="text-muted-foreground text-sm">{cluster.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
