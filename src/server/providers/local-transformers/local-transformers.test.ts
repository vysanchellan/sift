import { describe, expect, it, vi } from 'vitest'

import {
  LocalTransformersAIProvider,
  LOCAL_EMBEDDING_DIMENSIONS,
  LOCAL_EMBEDDING_MODEL,
} from './index'

describe('LocalTransformersAIProvider', () => {
  it('embeds text via a transformers feature-extraction pipeline (mean pooling, normalized)', async () => {
    const data = new Float32Array([0.25, 0.5, 0.75, 1])
    const fakeExtractor = vi.fn().mockResolvedValue({ data })
    const pipeline = vi.fn().mockResolvedValue(fakeExtractor)
    const load = vi.fn().mockResolvedValue({ pipeline })

    const provider = new LocalTransformersAIProvider({ load })

    const result = await provider.embed('hello')

    expect(load).toHaveBeenCalledTimes(1)
    expect(pipeline).toHaveBeenCalledWith('feature-extraction', LOCAL_EMBEDDING_MODEL, {
      quantized: true,
    })
    expect(fakeExtractor).toHaveBeenCalledWith('hello', { pooling: 'mean', normalize: true })
    expect(result.embedding).toEqual([0.25, 0.5, 0.75, 1])
    expect(result.model).toBe(LOCAL_EMBEDDING_MODEL)
    expect(result.dimensions).toBe(4)
  })

  it('reuses the loaded pipeline across embed calls', async () => {
    const pipeline = vi
      .fn()
      .mockResolvedValue(vi.fn().mockResolvedValue({ data: new Float32Array([0.5, -0.5]) }))
    const load = vi.fn().mockResolvedValue({ pipeline })

    const provider = new LocalTransformersAIProvider({ load })
    await provider.embed('a')
    await provider.embed('b')

    expect(load).toHaveBeenCalledTimes(1)
    expect(pipeline).toHaveBeenCalledTimes(1)
  })

  it('throws a ProviderError when embed returns non-numeric values', async () => {
    const pipeline = vi
      .fn()
      .mockResolvedValue(vi.fn().mockResolvedValue({ data: new Float32Array([NaN]) }))
    const provider = new LocalTransformersAIProvider({ load: () => Promise.resolve({ pipeline }) })

    await expect(provider.embed('x')).rejects.toThrow(/non-numeric/)
  })

  it('reports the expected embedding dimension for the default model', () => {
    expect(LOCAL_EMBEDDING_DIMENSIONS).toBe(384)
  })

  it('rejects unsupported text-generation methods', async () => {
    const provider = new LocalTransformersAIProvider({
      load: () => Promise.resolve({ pipeline: vi.fn() }),
    })
    await expect(provider.summarize('x')).rejects.toThrow(/does not support summarize/)
    await expect(provider.extractKeywords('x')).rejects.toThrow(/does not support extractKeywords/)
    await expect(provider.classify('x', ['a'])).rejects.toThrow(/does not support classify/)
  })

  it('throws when the transformers module exposes no pipeline', async () => {
    const provider = new LocalTransformersAIProvider({ load: () => Promise.resolve({}) })
    await expect(provider.embed('x')).rejects.toThrow(/pipeline is not available/)
  })
})
