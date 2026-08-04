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
 *   - `local` (default for local dev) → LocalTransformersAIProvider (all-MiniLM-L6-v2, 384)
 *   - `gemini` (default for Vercel)   → GeminiAIProvider.embed (gemini-embedding-001, 3072)
 *
 * On Vercel, the default is `gemini` because the local provider requires native
 * ONNX Runtime binaries (`libonnxruntime.so`) that are not available in the
 * serverless environment. Set `KB_EMBEDDING_PROVIDER=local` explicitly only for
 * local development. When using `gemini`, the embedding vector column must be
 * 3072 dimensions (see migration comments).
 */

export const KB_EMBEDDING_PROVIDER_ENV = 'KB_EMBEDDING_PROVIDER'
export const KB_DEFAULT_EMBEDDING_PROVIDER = process.env.VERCEL ? 'gemini' : 'local'

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
