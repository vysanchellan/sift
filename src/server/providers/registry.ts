import type { AIProvider } from './ai'
import type { SourceProvider } from './sources'

export class ProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

const sourceProviders = new Map<string, SourceProvider>()
const aiProviders = new Map<string, AIProvider>()

function requireKey(value: string | undefined, envName: string): string {
  if (!value) {
    throw new ProviderError(
      `${envName} is not set. Set it to the id of the provider you want to use, or pass the id explicitly.`
    )
  }
  return value
}

/**
 * Register a source provider. By default it is keyed by `provider.kind`, so
 * the active provider can be selected by setting `SOURCE_PROVIDER=<kind>`.
 */
export function registerSourceProvider(provider: SourceProvider, kind = provider.kind): void {
  sourceProviders.set(kind, provider)
}

/**
 * Register an AI provider. By default it is keyed by `provider.name`, so the
 * active provider can be selected by setting `AI_PROVIDER=<name>`.
 */
export function registerAIProvider(provider: AIProvider, name = provider.name): void {
  aiProviders.set(name, provider)
}

/** Resolve the active source provider, chosen from the `SOURCE_PROVIDER` env var. */
export function getSourceProvider(kind?: string): SourceProvider {
  const key = requireKey(kind ?? process.env.SOURCE_PROVIDER, 'SOURCE_PROVIDER')
  const provider = sourceProviders.get(key)
  if (!provider) {
    throw new ProviderError(
      `No source provider registered for "${key}". Register one with registerSourceProvider() first.`
    )
  }
  return provider
}

/** Resolve the active AI provider, chosen from the `AI_PROVIDER` env var. */
export function getAIProvider(name?: string): AIProvider {
  const key = requireKey(name ?? process.env.AI_PROVIDER, 'AI_PROVIDER')
  const provider = aiProviders.get(key)
  if (!provider) {
    throw new ProviderError(
      `No AI provider registered for "${key}". Register one with registerAIProvider() first.`
    )
  }
  return provider
}

export function hasSourceProvider(kind: string): boolean {
  return sourceProviders.has(kind)
}

export function hasAIProvider(name: string): boolean {
  return aiProviders.has(name)
}

/** Remove a registered source provider. Returns true if one was removed. */
export function unregisterSourceProvider(kind: string): boolean {
  return sourceProviders.delete(kind)
}

/** Remove a registered AI provider. Returns true if one was removed. */
export function unregisterAIProvider(name: string): boolean {
  return aiProviders.delete(name)
}

export function registeredSourceProviders(): string[] {
  return [...sourceProviders.keys()]
}

export function registeredAIProviders(): string[] {
  return [...aiProviders.keys()]
}
