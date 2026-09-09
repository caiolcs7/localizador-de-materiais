import type { SearchResult } from '../../types/inventory'
import { normalizeSearch } from '../../utils/normalize'

const RECENT_SEARCH_LIMIT = 10
const COMPLETE_SEARCH_KINDS = new Set<SearchResult['kind']>([
  'exact',
  'equivalent',
  'bombona',
  'endereco',
])

export function isCompleteSearch(result: SearchResult) {
  return result.items.length > 0 && COMPLETE_SEARCH_KINDS.has(result.kind)
}

export function normalizeRecentSearch(value: string) {
  return value.trim().toUpperCase()
}

export function mergeRecentSearch(values: string[], value: string) {
  const normalizedValue = normalizeRecentSearch(value)
  const normalizedKey = normalizeSearch(normalizedValue)

  if (!normalizedKey) return deduplicateRecentSearches(values)

  return [
    normalizedValue,
    ...values.filter(item => normalizeSearch(item) !== normalizedKey),
  ].slice(0, RECENT_SEARCH_LIMIT)
}

export function deduplicateRecentSearches(values: string[]) {
  return values.reduce<string[]>((unique, value) => {
    const normalizedValue = normalizeRecentSearch(value)
    const normalizedKey = normalizeSearch(normalizedValue)

    if (!normalizedKey || unique.some(item => normalizeSearch(item) === normalizedKey)) return unique
    unique.push(normalizedValue)
    return unique
  }, []).slice(0, RECENT_SEARCH_LIMIT)
}

export function loadRecentSearches(key: string, storage: Pick<Storage, 'getItem'> = localStorage): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? '[]')
    return Array.isArray(value)
      ? deduplicateRecentSearches(value.filter((item): item is string => typeof item === 'string'))
      : []
  } catch {
    return []
  }
}
