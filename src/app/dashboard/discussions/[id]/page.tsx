'use client'

import { useParams } from 'next/navigation'

import { DiscussionDetailView } from '@/features/dashboard/components/discussion-detail'

export default function DiscussionDetailPage() {
  const params = useParams<{ id: string }>()
  return <DiscussionDetailView discussionId={params?.id ?? ''} />
}
