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

/**
 * Gemini AI provider (Google Generative Language API).
 *
 * - Reads the API key from `process.env.GEMINI_API_KEY` (free tier is fine);
 *   it can be overridden via constructor options for tests.
 * - Text tasks (summarize / keywords / classify) use a text model
 *   (`GEMINI_MODEL`, default gemini-3.1-flash-lite); `embed()` uses a dedicated
 *   embedding model (`GEMINI_EMBEDDING_MODEL`, default gemini-embedding-001).
 * - Requests are paced (min gap between calls) and retried with exponential
 *   backoff on 429/5xx, honoring `Retry-After`, to stay inside free-tier rate
 *   limits. Structured tasks ask for JSON and are parsed defensively.
 */

export const GEMINI_DEFAULT_MODEL = 'gemini-3.1-flash-lite'
export const GEMINI_DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001'
const DEFAULT_MIN_REQUEST_GAP_MS = 250
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_BASE_MS = 1000
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class GeminiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiProviderError'
  }
}

export interface GeminiAIProviderOptions {
  /** API key. Defaults to `process.env.GEMINI_API_KEY`. */
  apiKey?: string
  /** Text-generation model. Defaults to `GEMINI_MODEL` env or gemini-3.1-flash-lite. */
  model?: string
  /** Embedding model. Defaults to `GEMINI_EMBEDDING_MODEL` env or gemini-embedding-001. */
  embeddingModel?: string
  /** Minimum milliseconds between any two API requests. Default 250. */
  minRequestGapMs?: number
  /** Number of retries on 429/5xx. Default 3. */
  maxRetries?: number
  /** Base milliseconds for retry backoff. Default 1000. */
  retryBaseDelayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function parseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.search(/[[{]/)
    const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
    if (start >= 0 && end > start) {
      const slice = cleaned.slice(start, end + 1)
      try {
        return JSON.parse(slice)
      } catch {
        // fall through
      }
    }
  }
  throw new GeminiProviderError(`Gemini returned invalid JSON: ${raw.slice(0, 200)}`)
}

function parseRetryAfterMs(response: Response): number | null {
  const value = response.headers.get('retry-after')
  if (!value) return null
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return seconds * 1000
}

export class GeminiAIProvider implements AIProvider {
  readonly name = 'gemini'

  private readonly apiKey: string
  private readonly model: string
  private readonly embeddingModel: string
  private readonly minRequestGapMs: number
  private readonly maxRetries: number
  private readonly retryBaseDelayMs: number
  private lastRequestAt = 0

  constructor(options: GeminiAIProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? ''
    this.model = options.model ?? process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL
    this.embeddingModel =
      options.embeddingModel ?? process.env.GEMINI_EMBEDDING_MODEL ?? GEMINI_DEFAULT_EMBEDDING_MODEL
    this.minRequestGapMs = Math.max(0, options.minRequestGapMs ?? DEFAULT_MIN_REQUEST_GAP_MS)
    this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES)
    this.retryBaseDelayMs = Math.max(1, options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_MS)
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new GeminiProviderError('GEMINI_API_KEY is not set.')
    }
    return this.apiKey
  }

  async summarize(text: string, options?: SummarizeOptions): Promise<SummarizeResult> {
    const maxLength = options?.maxLength ?? 120
    const prompt = [
      `Write a concise, informative summary of the discussion below in at most ${maxLength} words.`,
      'Use plain sentences. No markdown, no lists.',
      `\n${text}`,
    ].join('\n')
    const raw = await this.generateText(prompt, {
      temperature: 0.3,
      maxOutputTokens: 300,
      signal: options?.signal,
    })
    return { summary: raw.trim().replace(/\s+/g, ' ') }
  }

  async extractKeywords(text: string, options?: ExtractKeywordsOptions): Promise<string[]> {
    const limit = options?.limit ?? 8
    const prompt = [
      `Extract the ${limit} most relevant keywords or short key phrases from the discussion below.`,
      'Return ONLY a JSON array of strings, e.g. ["go", "concurrency"].',
      `\n${text}`,
    ].join('\n')
    const raw = await this.generateText(prompt, {
      temperature: 0.2,
      maxOutputTokens: 200,
      responseMimeType: 'application/json',
      signal: options?.signal,
    })
    const parsed = parseJson(raw)
    if (!Array.isArray(parsed)) {
      throw new GeminiProviderError(
        `Gemini keywords response was not a JSON array: ${raw.slice(0, 120)}`
      )
    }
    return parsed
      .slice(0, limit)
      .map((keyword) => String(keyword).trim().toLowerCase())
      .filter(Boolean)
  }

  async classify(
    text: string,
    labels: string[],
    options?: ClassifyOptions
  ): Promise<ClassifyResult> {
    const prompt = [
      `Classify the discussion below into exactly one of these categories: ${labels.join(', ')}.`,
      'Return ONLY JSON: {"label": "<one of the listed categories>", "confidence": 0.0..1.0, "rationale": "<one short sentence>"}',
      `\n${text}`,
    ].join('\n')
    const raw = await this.generateText(prompt, {
      temperature: 0.1,
      maxOutputTokens: 200,
      responseMimeType: 'application/json',
      signal: options?.signal,
    })
    const parsed = parseJson(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new GeminiProviderError(
        `Gemini classify response was not a JSON object: ${raw.slice(0, 120)}`
      )
    }
    const record = parsed as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label : (labels[0] ?? 'unknown')
    const confidence = clamp01(Number(record.confidence))
    const rationale = typeof record.rationale === 'string' ? record.rationale : undefined
    return { label, confidence, ...(rationale ? { rationale } : {}) }
  }

  async embed(text: string, options?: EmbedOptions): Promise<EmbeddingResult> {
    const body = {
      model: `models/${this.embeddingModel}`,
      content: { parts: [{ text }] },
    }
    const response = await this.request(
      `${API_BASE}/models/${this.embeddingModel}:embedContent?key=${this.requireKey()}`,
      { method: 'POST', body: JSON.stringify(body), signal: options?.signal }
    )
    const data = (await response.json()) as { embedding?: { values?: unknown[] } }
    const values = data?.embedding?.values
    if (!Array.isArray(values)) {
      throw new GeminiProviderError('Gemini embed response had no embedding values.')
    }
    const embedding = values.map((value) => Number(value))
    if (embedding.some((value) => !Number.isFinite(value))) {
      throw new GeminiProviderError('Gemini embed response contained non-numeric values.')
    }
    return { embedding, model: this.embeddingModel, dimensions: embedding.length }
  }

  private async generateText(
    prompt: string,
    config: {
      temperature: number
      maxOutputTokens: number
      responseMimeType?: string
      signal?: AbortSignal
    }
  ): Promise<string> {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
      },
    }
    const response = await this.request(
      `${API_BASE}/models/${this.model}:generateContent?key=${this.requireKey()}`,
      { method: 'POST', body: JSON.stringify(body), signal: config.signal }
    )
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const parts = data?.candidates?.[0]?.content?.parts
    const text = (parts ?? []).map((part) => part.text ?? '').join('')
    if (!text.trim()) {
      throw new GeminiProviderError('Gemini generateContent returned no text.')
    }
    return text
  }

  private async request(url: string, init: RequestInit, retryCount = 0): Promise<Response> {
    await this.paceRequest()
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) },
    })

    const retriable = response.status === 429 || response.status === 500 || response.status === 503
    if (retriable && retryCount < this.maxRetries) {
      const backoff = this.retryBaseDelayMs * 2 ** retryCount
      const delay = Math.max(backoff, parseRetryAfterMs(response) ?? 0)
      await sleep(delay)
      return this.request(url, init, retryCount + 1)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new GeminiProviderError(
        `Gemini API request failed with status ${response.status}. ${detail.slice(0, 300)}`
      )
    }
    return response
  }

  private async paceRequest(): Promise<void> {
    const now = Date.now()
    const gap = this.minRequestGapMs - (now - this.lastRequestAt)
    if (gap > 0) await sleep(gap)
    this.lastRequestAt = Date.now()
  }
}
