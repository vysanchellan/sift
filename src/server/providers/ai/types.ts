export interface SummarizeOptions {
  maxLength?: number
  signal?: AbortSignal
}

export interface SummarizeResult {
  summary: string
}

export interface ExtractKeywordsOptions {
  limit?: number
  signal?: AbortSignal
}

export interface ClassifyOptions {
  signal?: AbortSignal
}

export interface ClassifyResult {
  label: string
  confidence: number
  rationale?: string
}

export interface EmbedOptions {
  signal?: AbortSignal
}

export interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
}

/**
 * Contract implemented by every AI capability provider (Gemini, OpenAI, ...).
 * Consumers depend on this interface (via the provider registry), never on a
 * concrete provider class.
 */
export interface AIProvider {
  /** Stable identifier used to select this provider via env config. */
  readonly name: string

  /** Produce a short summary of the given text. */
  summarize(text: string, options?: SummarizeOptions): Promise<SummarizeResult>

  /** Extract the most relevant keywords/keyphrases from the given text. */
  extractKeywords(text: string, options?: ExtractKeywordsOptions): Promise<string[]>

  /** Embed a single text into a fixed-dimension vector. */
  embed(text: string, options?: EmbedOptions): Promise<EmbeddingResult>

  /** Assign one of the candidate labels to the given text. */
  classify(text: string, labels: string[], options?: ClassifyOptions): Promise<ClassifyResult>
}
