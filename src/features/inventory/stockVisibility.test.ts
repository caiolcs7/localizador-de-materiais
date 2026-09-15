import { describe, expect, it } from 'vitest'
import { hasVerifiedBombona, isVisibleWithStockFilter } from './stockVisibility'

describe('stock visibility', () => {
  it('shows positive stock and hides ordinary zero/null stock', () => {
    expect(isVisibleWithStockFilter({ bombona: 'N/T', descritivo: 'CABO FLEX VERDE 2,5MM', quantidade: 2 })).toBe(true)
    expect(isVisibleWithStockFilter({ bombona: 'N/T', descritivo: 'CABO FLEX VERDE 2,5MM', quantidade: 0 })).toBe(false)
    expect(isVisibleWithStockFilter({ bombona: 'N/T', descritivo: 'CABO FLEX VERDE 2,5MM', quantidade: null })).toBe(false)
  })

  it('keeps fasteners and terminals without stock only when a real bombona exists', () => {
    for (const description of ['Parafuso Phillips', 'Porca M6', 'Arruela lisa', 'Terminal olhal']) {
      expect(isVisibleWithStockFilter({ bombona: 'R14B005', descritivo: description, quantidade: 0 })).toBe(true)
      expect(isVisibleWithStockFilter({ bombona: 'N/T', descritivo: description, quantidade: 0 })).toBe(false)
    }
  })

  it('accepts the optional S suffix but rejects addresses and placeholders as bombonas', () => {
    expect(hasVerifiedBombona('R13B013S')).toBe(true)
    expect(hasVerifiedBombona('R14A1C05EP02')).toBe(false)
    expect(hasVerifiedBombona('N/T')).toBe(false)
  })
})
