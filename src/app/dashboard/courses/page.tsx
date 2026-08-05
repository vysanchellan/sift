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
      ? 'border-bush-600/30 bg-bush-600/10 text-bush-700 dark:border-bush-400/30 dark:bg-bush-400/10 dark:text-bush-300'
      : Number(score) >= 0.3
        ? 'border-bay-600/30 bg-bay-600/10 text-bay-700 dark:border-bay-400/30 dark:bg-bay-400/10 dark:text-bay-300'
        : 'border-red-800/40 bg-red-800/10 text-red-300/90 dark:border-red-700/40 dark:bg-red-700/10 dark:text-red-400/90'
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
    return <p className="text-sand-500 dark:text-sand-400">Sign in to view your course mapper.</p>
  }

  const [coursesResult, ideasResult] = await Promise.all([
    listCoursesWithSections(user.id),
    listUnmatchedLessonIdeas(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Course mapper</h1>
        <p className="text-sand-500 dark:text-sand-400">
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

      <div>
        <h2 className="text-foreground mb-6 font-serif text-2xl font-normal">Courses</h2>
        {coursesResult.error && (
          <p className="text-destructive mb-4 text-sm">{coursesResult.error}</p>
        )}
        {coursesResult.courses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No courses yet. Create one or import an outline.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {coursesResult.courses.map((course) => (
              <Card
                key={course.id}
                className="border-border/80 hover:border-primary/40 group flex h-full flex-col overflow-hidden rounded-xl border bg-transparent transition-all"
              >
                {/* Visual Top Header */}
                <div className="bg-muted border-border/80 relative h-28 w-full overflow-hidden border-b">
                  <div className="from-primary/10 to-primary/30 absolute inset-0 bg-gradient-to-tr mix-blend-overlay" />
                  <div className="from-primary/20 absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-3 left-4">
                    <span className="bg-primary rounded px-2.5 py-0.5 text-[9px] font-semibold tracking-wider text-[#efefef] uppercase">
                      Outline
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-1 flex-col justify-between space-y-4 p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-foreground group-hover:text-primary font-serif text-xl font-normal transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-muted-foreground mt-1 text-xs">{course.description}</p>
                      )}
                    </div>

                    <ul className="space-y-4 pl-1">
                      {course.sections.length === 0 && (
                        <li className="text-muted-foreground text-xs">
                          No sections yet. Add one below.
                        </li>
                      )}
                      {course.sections.map((section) => (
                        <li key={section.id} className="border-border/80 space-y-2 border-l pl-3">
                          <div>
                            <h4 className="text-foreground/90 text-sm font-semibold">
                              {section.title}
                            </h4>
                            {section.description && (
                              <p className="text-muted-foreground text-xs">{section.description}</p>
                            )}
                          </div>

                          <ul className="mt-1 space-y-0.5 pl-2">
                            {section.lessons.map((lesson) => (
                              <li key={lesson.id} className="text-muted-foreground/80 text-xs">
                                • {lesson.title}
                                {lesson.content && <span> — {lesson.content}</span>}
                              </li>
                            ))}
                          </ul>

                          {section.matches.length > 0 && (
                            <div className="mt-2">
                              <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-wider uppercase">
                                Answers {section.matches.length} discussion(s)
                              </p>
                              <ul className="mt-1 space-y-1">
                                {section.matches.map((match) => (
                                  <li
                                    key={match.id}
                                    className="border-border/60 hover:border-primary/45 flex items-center justify-between gap-3 rounded-md border bg-transparent px-3 py-2 text-xs transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-foreground/90 truncate font-medium">
                                        {match.discussion?.title ?? 'Unknown discussion'}
                                      </p>
                                      {match.reason && (
                                        <p className="text-muted-foreground/70 truncate text-[10px]">
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

                          <div className="mt-2 pt-1">
                            <SectionForm courseId={course.id} />
                          </div>
                          <div className="mt-1 pl-3">
                            <LessonForm sectionId={section.id} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
            <p className="text-sand-500 dark:text-sand-400">
              No candidate clusters. Run clustering (Prompt 7) and add sections to see ideas.
            </p>
          ) : (
            <ul className="divide-y">
              {ideasResult.ideas.map(({ cluster, memberCount }) => (
                <li key={cluster.id} className="py-2">
                  <p className="font-medium">
                    {cluster.title}{' '}
                    <span className="text-sand-500 dark:text-sand-400 text-xs font-normal">
                      · {memberCount} discussion(s)
                    </span>
                  </p>
                  {cluster.summary && (
                    <p className="text-sand-500 dark:text-sand-400 text-sm">{cluster.summary}</p>
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
