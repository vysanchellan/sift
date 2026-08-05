'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

import {
  createCourse,
  createCourseLesson,
  createCourseSection,
  type CreateLessonResult,
  type CreateSectionResult,
} from '../actions'

export function CourseForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await createCourse({ title, description })
      if (!result.ok) {
        toast({
          title: 'Create failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      } else {
        setTitle('')
        setDescription('')
        toast({ title: 'Course created', variant: 'success' })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="course-title">Course title</Label>
        <Input
          id="course-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Go Concurrency"
          disabled={pending}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course-description">Description (optional)</Label>
        <Input
          id="course-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this course teaches"
          disabled={pending}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Creating…' : 'Create course'}
        </Button>
      </div>
    </form>
  )
}

export function SectionForm({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const result: CreateSectionResult = await createCourseSection({
        courseId,
        title,
        description,
      })
      if (!result.ok) {
        toast({
          title: 'Add section failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      } else {
        setTitle('')
        setDescription('')
        toast({ title: 'Section added', variant: 'success' })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid gap-2">
        <Label htmlFor={`section-title-${courseId}`}>Section title</Label>
        <Input
          id={`section-title-${courseId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Channels"
          disabled={pending}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`section-desc-${courseId}`}>Description (optional)</Label>
        <Input
          id={`section-desc-${courseId}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Adding…' : 'Add section'}
        </Button>
      </div>
    </form>
  )
}

export function LessonForm({ sectionId }: { sectionId: string }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      const result: CreateLessonResult = await createCourseLesson({ sectionId, title, content })
      if (!result.ok) {
        toast({
          title: 'Add lesson failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      } else {
        setTitle('')
        setContent('')
        toast({ title: 'Lesson added', variant: 'success' })
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid gap-2">
        <Label htmlFor={`lesson-title-${sectionId}`}>Lesson title</Label>
        <Input
          id={`lesson-title-${sectionId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Buffered channels"
          disabled={pending}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`lesson-content-${sectionId}`}>Content (optional)</Label>
        <textarea
          id={`lesson-content-${sectionId}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-16 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3"
          placeholder="Teaching notes for this lesson"
          disabled={pending}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          {pending ? 'Adding…' : 'Add lesson'}
        </Button>
      </div>
    </form>
  )
}
