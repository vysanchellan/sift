'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  getDashboardOverview,
  getDiscussionDetail,
  getDiscussionFilters,
  getDiscussionsFeed,
} from './actions'
import type { DiscussionFeedFilters } from './queries'

interface ActionEnvelope<T> {
  ok: boolean
  data?: T
  error?: string
}

function unwrap<T>(result: ActionEnvelope<T>): T {
  if (!result.ok || result.data === undefined) {
    throw new Error(result.error ?? 'Request failed')
  }
  return result.data
}

/**
 * TanStack Query hooks wrapping the dashboard server actions. Every hook maps
 * a failed action into a query error so the UI can render one consistent error
 * state (isError / error.message) instead of inspecting result shapes.
 */
export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => getDashboardOverview().then(unwrap),
    staleTime: 60_000,
  })
}

export function useDiscussionDetail(discussionId: string) {
  return useQuery({
    queryKey: ['dashboard', 'discussion', discussionId],
    queryFn: () => getDiscussionDetail(discussionId).then(unwrap),
    enabled: Boolean(discussionId),
    staleTime: 60_000,
  })
}

export function useDiscussionFilters() {
  return useQuery({
    queryKey: ['dashboard', 'filters'],
    queryFn: () => getDiscussionFilters().then(unwrap),
    staleTime: 5 * 60_000,
  })
}

export function useDiscussionsFeed(filters: DiscussionFeedFilters) {
  return useQuery({
    queryKey: ['dashboard', 'feed', filters],
    queryFn: () => getDiscussionsFeed(filters).then(unwrap),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
