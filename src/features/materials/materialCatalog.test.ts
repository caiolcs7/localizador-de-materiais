import { describe, expect, it } from 'vitest'
import cartsSource from '../../data/cartsData.json'
import type { LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'
import { describedMaterials, getMaterialDescription, resolveMaterialVisual } from './materialCatalog'

describe('material visual catalog', () => {
  it('covers every unique cart code that has a description', () => {
    const expected = new Map<string, string>()
    for (const cart of cartsSource as LuminaireCart[]) {
      for (const item of cart.items) {
        if (item.descritivo?.trim() && !expected.has(normalizeSearch(item.codigo))) {
          expected.set(normalizeSearch(item.codigo), item.descritivo.trim())
        }
      }
    }

    expect(expected.size).toBe(95)
    expect(describedMaterials.size).toBe(expected.size)
    for (const [code, description] of expected) {
      expect(getMaterialDescription(code)).toBe(description)
      expect(resolveMaterialVisual(code, description)).not.toBeNull()
    }
  })

  it('only flags descriptions whose geometry is genuinely underspecified', () => {
    const uncertain = [...describedMaterials]
      .filter(([code, description]) => !resolveMaterialVisual(code, description)?.verified)
      .map(([code]) => code)
      .sort()

    expect(uncertain).toEqual(['ITL98400023', 'J9900000900'])
  })

  it('does not create a visual for codes without descriptions', () => {
    expect(resolveMaterialVisual('CODIGO-SEM-DESCRITIVO')).toBeNull()
  })

  it('prioritizes the technical cart description over a generic inventory note', () => {
    expect(getMaterialDescription('ITARSRM003BC', 'Salvo Por Monique')).toContain('ARRUELA AC BICROMATIZADO')
    expect(resolveMaterialVisual('ITARSRM003BC', 'Salvo Por Monique')).toMatchObject({
      family: 'serrated-washer',
      verified: true,
    })
  })
})
