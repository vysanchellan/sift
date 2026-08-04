import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GeminiAIProvider,
  GeminiProviderError,
  GEMINI_DEFAULT_EMBEDDING_MODEL,
  GEMINI_DEFAULT_MODEL,
} from './index'

const API_KEY = 'test-api-key'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeProvider(overrides: Record<string, unknown> = {}) {
  return new GeminiAIProvider({
    apiKey: API_KEY,
    minRequestGapMs: 1,
    retryBaseDelayMs: 1,
    maxRetries: 3,
    ...overrides,
  })
}

const textBody = 'A concise summary.'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GeminiAIProvider basics', () => {
  it('is registered under the "gemini" name', () => {
    expect(makeProvider().name).toBe('gemini')
  })

  it('throws a clear error when no API key is configured', async () => {
    const provider = new GeminiAIProvider({ apiKey: '' })
    await expect(provider.summarize('hello')).rejects.toThrow(GeminiProviderError)
    await expect(provider.summarize('hello')).rejects.toThrow(/GEMINI_API_KEY/)
  })
})

describe('summarize', () => {
  it('calls generateContent with the key and returns trimmed text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: textBody }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().summarize('Some long discussion text here.')

    expect(result.summary).toBe(textBody)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/models/${GEMINI_DEFAULT_MODEL}:generateContent`)
    expect(url).toContain(`key=${API_KEY}`)
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.contents[0].parts[0].text).toContain('Some long discussion text here.')
    expect(body.generationConfig.maxOutputTokens).toBe(300)
  })

  it('collapses internal whitespace in the summary', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'line1\n\n  line2  ' }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().summarize('text')
    expect(result.summary).toBe('line1 line2')
  })
})

describe('extractKeywords', () => {
  it('parses a JSON array response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: '["Go", " Concurrency "]' }] } }],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const keywords = await makeProvider().extractKeywords('text', { limit: 3 })
    expect(keywords).toEqual(['go', 'concurrency'])
  })

  it('requests JSON mime type and trims to the limit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: '["a","b","c","d"]' }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const keywords = await makeProvider().extractKeywords('text', { limit: 2 })
    expect(keywords).toEqual(['a', 'b'])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.generationConfig.responseMimeType).toBe('application/json')
  })

  it('throws when the response is not a JSON array', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ candidates: [{ content: { parts: [{ text: 'nope' }] } }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(makeProvider().extractKeywords('text')).rejects.toThrow(GeminiProviderError)
  })
})

describe('classify', () => {
  it('parses label, confidence and rationale', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: '{"label":"high","confidence":0.87,"rationale":"Clear ask."}' }],
            },
          },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().classify('text', ['high', 'medium', 'low'])
    expect(result).toEqual({ label: 'high', confidence: 0.87, rationale: 'Clear ask.' })
  })

  it('clamps confidence into 0..1 and tolerates missing fields', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: '{"confidence":2}' }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().classify('text', ['high', 'medium', 'low'])
    expect(result.confidence).toBe(1)
    expect(result.label).toBe('high')
  })

  it('recovers a JSON object wrapped in markdown fences', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: '```json\n{"label":"low","confidence":0.2}\n```' }] } },
        ],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().classify('text', ['high', 'low'])
    expect(result.label).toBe('low')
    expect(result.confidence).toBe(0.2)
  })
})

describe('embed', () => {
  it('calls embedContent and returns values, model and dimensions', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ embedding: { values: [0.1, 0.2, 0.3] } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().embed('text')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain(`/models/${GEMINI_DEFAULT_EMBEDDING_MODEL}:embedContent`)
    expect(url).toContain(`key=${API_KEY}`)
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe(`models/${GEMINI_DEFAULT_EMBEDDING_MODEL}`)
    expect(body.content.parts[0].text).toBe('text')
    expect(result).toEqual({
      embedding: [0.1, 0.2, 0.3],
      model: GEMINI_DEFAULT_EMBEDDING_MODEL,
      dimensions: 3,
    })
  })

  it('throws when no embedding values come back', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ embedding: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(makeProvider().embed('text')).rejects.toThrow(GeminiProviderError)
  })
})

describe('retries and pacing', () => {
  it('retries a 429 and succeeds on the next attempt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await makeProvider().summarize('text')
    expect(result.summary).toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries a 503 and honors a Retry-After header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503, headers: { 'retry-after': '1' } }))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
      )
    vi.stubGlobal('fetch', fetchMock)

    const started = Date.now()
    const result = await makeProvider().summarize('text')
    const elapsed = Date.now() - started

    expect(result.summary).toBe('ok')
    expect(elapsed).toBeGreaterThanOrEqual(900)
  })

  it('throws on a non-retriable error with the status in the message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, 400))
    vi.stubGlobal('fetch', fetchMock)

    await expect(makeProvider().summarize('text')).rejects.toThrow(/status 400/)
  })

  it('paces consecutive requests by minRequestGapMs', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }))
      )
    vi.stubGlobal('fetch', fetchMock)

    const provider = makeProvider({ minRequestGapMs: 60 })
    const started = Date.now()
    await provider.summarize('a')
    await provider.summarize('b')
    const elapsed = Date.now() - started

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(elapsed).toBeGreaterThanOrEqual(55)
  })
})
