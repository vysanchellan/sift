/**
 * Text extraction from uploaded documents, keyed by MIME type:
 *   - PDF          → pdf-parse (pdfjs) extracted text
 *   - markdown     → decoded as-is (no stripping; embeddings benefit from structure)
 *   - plain text   → decoded as-is
 *
 * Extraction is a thin, deterministic wrapper so the ingest pipeline stays
 * readable and tests can assert behavior per file type without touching the
 * network or the embedding provider.
 */

export const SUPPORTED_KB_MIME_TYPES = [
  'application/pdf',
  'text/markdown',
  'text/x-markdown',
  'text/plain',
  'text/md',
] as const

export type KbMimeType = (typeof SUPPORTED_KB_MIME_TYPES)[number]

export class UnsupportedFileTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported file type "${mimeType}". Supported: ${SUPPORTED_KB_MIME_TYPES.join(', ')}`)
    this.name = 'UnsupportedFileTypeError'
  }
}

export interface ExtractedText {
  text: string
  mimeType: KbMimeType
  /** Bytes decoded into text (only populated for non-PDF). */
  charCount: number
}

/** MIME type from a file name extension, falling back to a provided guess. */
export function detectMimeType(fileName: string, fallback?: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'md' || ext === 'markdown') return 'text/markdown'
  if (ext === 'txt' || ext === 'text') return 'text/plain'
  return fallback ?? 'text/plain'
}

function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

function decodeText(buffer: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

/**
 * Extract plain text from a PDF buffer using pdf-parse (pdfjs). Imported
 * lazily so the heavy pdfjs dependency is only loaded when actually needed.
 */
export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return (result.text ?? '').trim()
  } finally {
    await parser.destroy().catch(() => {})
  }
}

/**
 * Extract the text content of an uploaded file. Unknown MIME types raise
 * `UnsupportedFileTypeError`.
 */
export async function extractText(buffer: Uint8Array, mimeType: string): Promise<ExtractedText> {
  const normalized = mimeType.toLowerCase()

  if (isPdf(normalized)) {
    const text = await extractPdfText(buffer)
    return { text, mimeType: 'application/pdf', charCount: text.length }
  }

  const supported =
    normalized === 'text/markdown' ||
    normalized === 'text/x-markdown' ||
    normalized === 'text/plain' ||
    normalized === 'text/md'

  if (!supported) {
    throw new UnsupportedFileTypeError(mimeType)
  }

  const text = decodeText(buffer).trim()
  const isMarkdown =
    normalized === 'text/markdown' || normalized === 'text/x-markdown' || normalized === 'text/md'
  return { text, mimeType: isMarkdown ? 'text/markdown' : 'text/plain', charCount: text.length }
}
