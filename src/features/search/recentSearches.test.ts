import { describe, expect, it } from 'vitest'
import type { SearchResult } from '../../types/inventory'
import { deduplicateRecentSearches, isCompleteSearch, loadRecentSearches, mergeRecentSearch } from './recentSearches'

const result = (kind: SearchResult['kind'], items = 1): SearchResult => ({
  kind,
  items: Array.from({ length: items }, () => ({})) as SearchResult['items'],
})

describe('pesquisas recentes', () => {
  it('registra somente consultas completas com resultado', () => {
    expect(isCompleteSearch(result('prefix'))).toBe(false)
    expect(isCompleteSearch(result('contains'))).toBe(false)
    expect(isCompleteSearch(result('suggestion', 0))).toBe(false)
    expect(isCompleteSearch(result('exact'))).toBe(true)
    expect(isCompleteSearch(result('equivalent'))).toBe(true)
    expect(isCompleteSearch(result('bombona'))).toBe(true)
    expect(isCompleteSearch(result('endereco'))).toBe(true)
  })

  it('mantém apenas uma ocorrência do mesmo código, ignorando caixa e separadores', () => {
    expect(mergeRecentSearch(
      ['ITPFPHM408PAAI4', 'R13B045'],
      ' itpfphm-408-paai4 ',
    )).toEqual(['ITPFPHM-408-PAAI4', 'R13B045'])
  })

  it('não apaga códigos completos diferentes só porque um é prefixo do outro', () => {
    expect(deduplicateRecentSearches(['ABC123', 'ABC12345'])).toEqual(['ABC123', 'ABC12345'])
  })

  it('recupera com segurança dados persistidos inválidos', () => {
    expect(loadRecentSearches('recent', { getItem: () => '{invalid' })).toEqual([])
  })
})
