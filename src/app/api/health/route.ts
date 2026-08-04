import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSourceProvider, hasSourceProvider, registerSourceProvider } from '@/server/providers'
import { RedditRssProvider } from '@/server/providers/reddit'
import { getAIProvider, hasAIProvider, registerAIProvider } from '@/server/providers'
import { GeminiAIProvider } from '@/server/providers/gemini'
import { LocalTransformersAIProvider } from '@/server/providers/local-transformers'
import { getKnowledgeBaseEmbeddingProvider } from '@/features/knowledge-base/provider'
import type { Source } from '@/types'

interface HealthCheckResult {
  name: string
  status: 'ok' | 'degraded' | 'down'
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

async function checkSupabaseConnection(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('sources').select('id').limit(1)
    if (error) throw error
    return { name: 'Supabase (DB)', status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    return { name: 'Supabase (DB)', status: 'down', latencyMs: Date.now() - start, error: String(error) }
  }
}

async function checkSupabaseAuth(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()
    await supabase.auth.getUser()
    // getUser can return error if not authenticated, that's fine - we just check connectivity
    return { name: 'Supabase (Auth)', status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    return { name: 'Supabase (Auth)', status: 'degraded', latencyMs: Date.now() - start, error: String(error) }
  }
}

async function checkRedditRSS(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    if (!hasSourceProvider('reddit')) {
      registerSourceProvider(new RedditRssProvider())
    }
    const provider = getSourceProvider('reddit')
    // Test with a small, likely-to-exist subreddit
    const testSource: Pick<Source, 'id' | 'name' | 'config'> = {
      id: 'health-check',
      name: 'health-check',
      config: { subreddits: ['test'] },
    }
    await provider.fetchDiscussions(testSource as Source, { signal: AbortSignal.timeout(10000) })
    return { name: 'Reddit RSS', status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    return { name: 'Reddit RSS', status: 'down', latencyMs: Date.now() - start, error: String(error) }
  }
}

async function checkGeminiAPI(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    if (!hasAIProvider('gemini')) {
      registerAIProvider(new GeminiAIProvider())
    }
    const provider = getAIProvider('gemini')
    // Quick test - classify a simple text
    await provider.classify('Test', ['test'], { signal: AbortSignal.timeout(10000) })
    return { name: 'Gemini API', status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    return { name: 'Gemini API', status: 'down', latencyMs: Date.now() - start, error: String(error) }
  }
}

async function checkLocalEmbeddings(): Promise<HealthCheckResult> {
  // On Vercel, local embeddings are not supported (missing native ONNX Runtime binaries)
  // The KB embedding provider defaults to 'gemini' on Vercel, so this check is N/A
  if (process.env.VERCEL) {
    return { name: 'Local Embeddings', status: 'ok', latencyMs: 0, details: { note: 'Using Gemini embeddings on Vercel' } }
  }

  const start = Date.now()
  try {
    const provider = new LocalTransformersAIProvider()
    await provider.embed('Test embedding', { signal: AbortSignal.timeout(30000) })
    return { name: 'Local Embeddings', status: 'ok', latencyMs: Date.now() - start }
  } catch (error) {
    return { name: 'Local Embeddings', status: 'down', latencyMs: Date.now() - start, error: String(error) }
  }
}

async function checkKBEmbeddingProvider(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const provider = getKnowledgeBaseEmbeddingProvider()
    await provider.embed('Test KB embedding', { signal: AbortSignal.timeout(30000) })
    return { name: 'KB Embedding Provider', status: 'ok', latencyMs: Date.now() - start, details: { provider: provider.name } }
  } catch (error) {
    return { name: 'KB Embedding Provider', status: 'down', latencyMs: Date.now() - start, error: String(error) }
  }
}

export async function GET() {
  let healthChecks: HealthCheckResult[] = []
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy'

  try {
    const results = await Promise.allSettled([
      checkSupabaseConnection(),
      checkSupabaseAuth(),
      checkRedditRSS(),
      checkGeminiAPI(),
      checkLocalEmbeddings(),
      checkKBEmbeddingProvider(),
    ])

    healthChecks = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { name: 'Unknown', status: 'down', error: String(r.reason) }
    )

    overallStatus = healthChecks.every((c) => c.status === 'ok')
      ? 'healthy'
      : healthChecks.some((c) => c.status === 'ok')
        ? 'degraded'
        : 'unhealthy'
  } catch (error) {
    // If even the Promise.allSettled fails (extremely unlikely), return a minimal response
    healthChecks = [
      { name: 'Health Check System', status: 'down', error: String(error) },
    ]
    overallStatus = 'unhealthy'
  }

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: healthChecks,
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }
  )
}