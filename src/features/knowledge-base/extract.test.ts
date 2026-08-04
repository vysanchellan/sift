import { describe, expect, it, vi } from 'vitest'

import { detectMimeType, extractText, UnsupportedFileTypeError } from './extract'

describe('detectMimeType', () => {
  it('detects pdf, markdown, and text from extensions', () => {
    expect(detectMimeType('guide.pdf')).toBe('application/pdf')
    expect(detectMimeType('README.md')).toBe('text/markdown')
    expect(detectMimeType('notes.markdown')).toBe('text/markdown')
    expect(detectMimeType('diary.txt')).toBe('text/plain')
    expect(detectMimeType('diary.text')).toBe('text/plain')
  })

  it('falls back to the provided guess for unknown extensions', () => {
    expect(detectMimeType('noext', 'application/pdf')).toBe('application/pdf')
    expect(detectMimeType('noext')).toBe('text/plain')
  })
})

describe('extractText', () => {
  const encoder = new TextEncoder()

  it('decodes plain text as-is', async () => {
    const result = await extractText(encoder.encode('hello world'), 'text/plain')
    expect(result.text).toBe('hello world')
    expect(result.mimeType).toBe('text/plain')
    expect(result.charCount).toBe(11)
  })

  it('decodes markdown as-is without stripping', async () => {
    const md = '# Title\n\nSome **bold** and `code`.\n'
    const result = await extractText(encoder.encode(md), 'text/markdown')
    expect(result.text).toBe('# Title\n\nSome **bold** and `code`.')
    expect(result.mimeType).toBe('text/markdown')
  })

  it('maps text/md to markdown', async () => {
    const result = await extractText(encoder.encode('a'), 'text/md')
    expect(result.mimeType).toBe('text/markdown')
  })

  it('rejects unsupported MIME types', async () => {
    await expect(extractText(encoder.encode('x'), 'application/zip')).rejects.toThrow(
      UnsupportedFileTypeError
    )
  })
})

describe('extractPdfText', () => {
  it('parses a PDF via pdf-parse', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined)
    class PDFParseMock {
      constructor(readonly data: unknown) {}
      getText() {
        return Promise.resolve({ text: 'Hello PDF world' })
      }
      destroy() {
        return destroy()
      }
    }

    vi.doMock('pdf-parse', () => ({ PDFParse: PDFParseMock }))
    vi.resetModules()
    const { extractPdfText } = await import('./extract')

    const text = await extractPdfText(new Uint8Array([1, 2, 3]))
    expect(text).toBe('Hello PDF world')
    expect(destroy).toHaveBeenCalled()

    vi.resetModules()
    vi.doUnmock('pdf-parse')
  })
})
