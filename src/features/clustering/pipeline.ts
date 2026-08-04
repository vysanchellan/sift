import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Clustering pipeline. Calls the `cluster_discussions` SQL function, which
 * runs greedy leader clustering over the user's discussion embeddings using
 * pgvector cosine similarity (`<=>`) and upserts the resulting groups into the
 * `clusters` table. This module is deliberately thin: all vector math lives in
 * the SQL function so it is one place, close to the data.
 */

export const CLUSTER_DEFAULT_THRESHOLD = 0.7
export const CLUSTER_DEFAULT_MIN_SIZE = 2

export interface ClusteringResult {
  clusters: number
  error?: string
}

export async function clusterDiscussionsForUser(
  userId: string,
  options: { threshold?: number; minClusterSize?: number } = {}
): Promise<ClusteringResult> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('cluster_discussions', {
    p_user_id: userId,
    p_threshold: options.threshold ?? CLUSTER_DEFAULT_THRESHOLD,
    p_min_cluster_size: options.minClusterSize ?? CLUSTER_DEFAULT_MIN_SIZE,
  })

  if (error) {
    return { clusters: 0, error: `Clustering failed: ${error.message}` }
  }

  return { clusters: data ?? 0 }
}
