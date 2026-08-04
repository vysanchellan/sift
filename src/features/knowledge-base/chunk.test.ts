import { describe, expect, it } from 'vitest'

import { chunkText, DEFAULT_CHUNK_MAX_CHARS, DEFAULT_CHUNK_OVERLAP_CHARS } from './chunk'

describe('chunkText', () => {
  it('returns an empty array for blank input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n\n  ')).toEqual([])
  })

  it('returns a single chunk when the text fits', () => {
    const text = 'Hello world.'
    expect(chunkText(text)).toEqual([{ index: 0, content: 'Hello world.' }])
  })

  it('preserves blank-line-separated paragraphs inside one chunk when they fit', () => {
    const text = 'Paragraph one.\n\nParagraph two.'
    expect(chunkText(text, { maxChars: 100 })).toEqual([
      { index: 0, content: 'Paragraph one.\n\nParagraph two.' },
    ])
  })

  it('splits into multiple chunks when content exceeds maxChars', () => {
    // maxChars 10 with overlap 0 → each segment goes into its own chunk.
    const text = 'aaaa bbbb cccc dddd'
    expect(chunkText(text, { maxChars: 10, overlapChars: 0 })).toEqual([
      { index: 0, content: 'aaaa bbbb' },
      { index: 1, content: 'cccc dddd' },
    ])
  })

  it('carries a trailing overlap into the next chunk', () => {
    // maxChars 10, overlap 3: chunk 0 is "aaaa bbbb", so chunk 1 begins with
    // the last 3 chars "bbb" followed by the next segment.
    const text = 'aaaa bbbb cccc dddd'
    expect(chunkText(text, { maxChars: 10, overlapChars: 3 })).toEqual([
      { index: 0, content: 'aaaa bbbb' },
      { index: 1, content: 'bbb\n\ncccc dddd' },
    ])
  })

  it('hard-splits a single long word at maxChars', () => {
    const text = 'x'.repeat(25)
    expect(chunkText(text, { maxChars: 10, overlapChars: 0 })).toEqual([
      { index: 0, content: 'x'.repeat(10) },
      { index: 1, content: 'x'.repeat(10) },
      { index: 2, content: 'x'.repeat(5) },
    ])
  })

  it('drops trailing blank content', () => {
    expect(chunkText('word\n\n\n', { maxChars: 10 })).toEqual([{ index: 0, content: 'word' }])
  })

  it('normalizes CRLF line endings', () => {
    expect(chunkText('a\r\n\r\nb', { maxChars: 50 })).toEqual([{ index: 0, content: 'a\n\nb' }])
  })

  it('exports the defaults used by the ingest pipeline', () => {
    expect(DEFAULT_CHUNK_MAX_CHARS).toBe(1200)
    expect(DEFAULT_CHUNK_OVERLAP_CHARS).toBe(200)
  })
})
