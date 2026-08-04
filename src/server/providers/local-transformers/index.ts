import type {
  AIProvider,
  ClassifyOptions,
  ClassifyResult,
  EmbedOptions,
  EmbeddingResult,
  ExtractKeywordsOptions,
  SummarizeOptions,
  SummarizeResult,
} from '@/server/providers/ai'
import { ProviderError } from '@/server/providers/registry'

/**
 * Local AI provider backed by @xenova/transformers (Transformers.js). Only the
 * `embed` capability is implemented — text-generation tasks (summarize /
 * keywords / classify) are intentionally not supported and raise
 * `ProviderError`. This makes it a cheap, quota-free drop-in for the embedding
 * step (e.g. the knowledge-base ingest) selected via config, without touching
 * the Gemini free-tier quota.
 *
 * The model is loaded lazily on first `embed` call and cached for the process
 * lifetime.
 */

export const LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const LOCAL_EMBEDDING_DIMENSIONS = 384

interface FeatureExtractionResult {
  data: ArrayLike<number>
}

interface TransformersModule {
  pipeline?: (task: string, model: string, options?: unknown) => Promise<unknown>
}

function unsupported(method: string, context?: unknown): never {
  throw new ProviderError(
    `LocalTransformersAIProvider does not support ${method}; use a text-generation provider.${context ? ' Context ignored.' : ''}`
  )
}

export interface LocalTransformersProviderOptions {
  /** Transformers.js model id. Default Xenova/all-MiniLM-L6-v2 (384 dims). */
  model?: string
  /** Module loader for tests / lazy bundling. Defaults to dynamic import. */
  load?: () => Promise<TransformersModule>
}

export class LocalTransformersAIProvider implements AIProvider {
  readonly name = 'local'

  private readonly model: string
  private readonly loadModule: () => Promise<TransformersModule>
  private extractorPromise: Promise<FeatureExtractionResult | unknown> | null = null

  constructor(options: LocalTransformersProviderOptions = {}) {
    this.model = options.model ?? process.env.LOCAL_EMBEDDING_MODEL ?? LOCAL_EMBEDDING_MODEL
    this.loadModule =
      options.load ?? (async () => (await import('@xenova/transformers')) as TransformersModule)
  }

  private async getExtractor(): Promise<
    (text: string, opts?: unknown) => Promise<FeatureExtractionResult>
  > {
    if (!this.extractorPromise) {
      this.extractorPromise = this.loadModule().then((mod) => {
        if (typeof mod.pipeline !== 'function') {
          throw new ProviderError('@xenova/transformers pipeline is not available.')
        }
        return mod.pipeline('feature-extraction', this.model, {
          quantized: true,
        })
      })
    }
    const extractor = (await this.extractorPromise) as (
      text: string,
      opts?: unknown
    ) => Promise<FeatureExtractionResult>
    return extractor
  }

  async embed(text: string, options?: EmbedOptions): Promise<EmbeddingResult> {
    if (options?.signal?.aborted) {
      throw new ProviderError('Local embed aborted.')
    }
    const extractor = await this.getExtractor()
    const result = await extractor(text, { pooling: 'mean', normalize: true })
    const embedding = Array.from(result.data, (value) => Number(value))
    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new ProviderError('Local embed produced non-numeric values.')
    }
    return {
      embedding,
      model: this.model,
      dimensions: embedding.length,
    }
  }

  async summarize(_text: string, _options?: SummarizeOptions): Promise<SummarizeResult> {
    return unsupported('summarize', { text: _text, options: _options })
  }

  async extractKeywords(_text: string, _options?: ExtractKeywordsOptions): Promise<string[]> {
    return unsupported('extractKeywords', { text: _text, options: _options })
  }

  async classify(
    _text: string,
    _labels: string[],
    _options?: ClassifyOptions
  ): Promise<ClassifyResult> {
    return unsupported('classify', { text: _text, labels: _labels, options: _options })
  }
}
