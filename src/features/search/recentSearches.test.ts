import { describe, expect, it } from 'vitest'
import { addRecentSearch, loadRecentSearches, sanitizeRecentSearches } from './recentSearches'

describe('recentSearches', () => {
  it('removes duplicates and fragments when the complete code exists', () => {
    expect(sanitizeRecentSearches([
      'ITPF',
      'itpfphm',
      'ITPFPHM408',
      'itpfphm408paai4',
      'ITPFPHM408PAAI4',
    ])).toEqual(['ITPFPHM408PAAI4'])
  })

  it('does not record live-search prefixes or partial matches', () => {
    const recent = ['ITPFPHM408PAAI4']
    expect(addRecentSearch(recent, 'ITPF', { kind: 'prefix', items: [{} as never] })).toEqual(recent)
    expect(addRecentSearch(recent, 'ITPFPHM', { kind: 'contains', items: [{} as never] })).toEqual(recent)
  })

  it('records a complete exact search once in uppercase', () => {
    const item = {} as never
    expect(addRecentSearch(['OUTRO'], ' itpfphm408paai4 ', { kind: 'exact', items: [item] }))
      .toEqual(['ITPFPHM408PAAI4', 'OUTRO'])
  })

  it('recovers safely from invalid persisted data', () => {
    expect(loadRecentSearches('recent', { getItem: () => '{invalid' })).toEqual([])
  })
})
