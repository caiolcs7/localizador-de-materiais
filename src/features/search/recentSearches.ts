import type { SearchResult } from '../../types/inventory'

const recordableKinds = new Set<SearchResult['kind']>(['exact', 'equivalent', 'bombona', 'endereco'])

const normalizeRecentSearch = (value: string) => value.trim().toUpperCase()

export function sanitizeRecentSearches(values: unknown, limit = 10): string[] {
  if (!Array.isArray(values)) return []

  const unique = [...new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map(normalizeRecentSearch)
    .filter(Boolean))]

  return unique
    .filter(value => !unique.some(other => other.length > value.length && other.startsWith(value)))
    .slice(0, limit)
}

export function loadRecentSearches(key: string, storage: Pick<Storage, 'getItem'> = localStorage): string[] {
  try {
    return sanitizeRecentSearches(JSON.parse(storage.getItem(key) ?? '[]'))
  } catch {
    return []
  }
}

export function addRecentSearch(current: string[], query: string, result: SearchResult): string[] {
  if (!recordableKinds.has(result.kind) || result.items.length === 0) return current
  return sanitizeRecentSearches([normalizeRecentSearch(query), ...current])
}
