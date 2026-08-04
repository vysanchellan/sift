/**
 * Pure text chunking. Splits a document into fixed-size, overlapping chunks so
 * each chunk fits comfortably inside an embedding model's input window. Pure
 * and deterministic (no I/O) so it can be unit-tested with hand-computed
 * expectations.
 */

export interface TextChunk {
  index: number
  content: string
}

export interface ChunkOptions {
  /** Maximum characters per chunk. Default 1200. */
  maxChars?: number
  /** Overlap (characters) carried from the end of one chunk into the next. Default 200. */
  overlapChars?: number
}

export const DEFAULT_CHUNK_MAX_CHARS = 1200
export const DEFAULT_CHUNK_OVERLAP_CHARS = 200

/** Split a single over-long segment on word boundaries (fallback: hard cut). */
function hardSplit(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const parts: string[] = []
  let rest = text.trim()
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars)
    if (cut <= 0) cut = maxChars
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

/**
 * Chunk `text` into overlapping pieces. Blank-line-separated paragraphs are
 * kept together when they fit; paragraphs longer than `maxChars` are split on
 * word boundaries. Returns an empty array for blank input.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const maxChars = Math.max(1, options.maxChars ?? DEFAULT_CHUNK_MAX_CHARS)
  const overlapChars = Math.max(0, options.overlapChars ?? DEFAULT_CHUNK_OVERLAP_CHARS)

  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const paragraphs = normalized.split(/\n\s*\n/)
  const segments = paragraphs.flatMap((paragraph) => {
    const trimmed = paragraph.trim()
    if (!trimmed) return []
    return hardSplit(trimmed, maxChars)
  })

  const chunks: string[] = []
  let current = ''

  for (const segment of segments) {
    if (current && current.length + 2 + segment.length > maxChars) {
      chunks.push(current)
      current = ''
    }

    if (!current && chunks.length > 0 && overlapChars > 0) {
      const previous = chunks[chunks.length - 1]
      if (previous.length > 0) {
        current = previous.slice(-overlapChars)
      }
    }

    current = current ? `${current}\n\n${segment}` : segment
  }
  if (current) chunks.push(current)

  return chunks.map((content, index) => ({ index, content }))
}
