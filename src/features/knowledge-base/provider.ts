import 'server-only'

import { GeminiAIProvider } from '@/server/providers/gemini'
import { LocalTransformersAIProvider } from '@/server/providers/local-transformers'
import {
  getAIProvider,
  hasAIProvider,
  registerAIProvider,
  type AIProvider,
} from '@/server/providers'

/**
 * Resolves the embedding provider used by the knowledge base, config-swappable
 * via `KB_EMBEDDING_PROVIDER`:
 *   - `local` (default) → LocalTransformersAIProvider (all-MiniLM-L6-v2, 384)
 *   - `gemini`          → GeminiAIProvider.embed (gemini-embedding-001, 3072)
 *
 * Local is the default: it is quota-free, private, and deterministic, so bulk
 * ingestion cannot hit the Gemini free-tier rate limit. The provider is
 * registered in the shared registry once per process. When switching to
 * `gemini`, the embedding vector column dimension must match the Gemini
 * model's output (3072), see the migration comments.
 */

export const KB_EMBEDDING_PROVIDER_ENV = 'KB_EMBEDDING_PROVIDER'
export const KB_DEFAULT_EMBEDDING_PROVIDER = 'local'

const registryKey = 'knowledge-base-embedding'

export function getKnowledgeBaseEmbeddingProvider(): AIProvider {
  const configured = process.env[KB_EMBEDDING_PROVIDER_ENV] ?? KB_DEFAULT_EMBEDDING_PROVIDER

  if (configured === 'local') {
    if (!hasAIProvider(registryKey)) {
      registerAIProvider(new LocalTransformersAIProvider(), registryKey)
    }
    return getAIProvider(registryKey)
  }

  if (!hasAIProvider('gemini')) {
    registerAIProvider(new GeminiAIProvider())
  }
  return getAIProvider('gemini')
}
