import { describe, expect, it } from 'vitest'
import { normalizeSearch } from '../../utils/normalize'
import { defaultCarts } from '../carts/cartData'
import { describedMaterials, getMaterialDescription, resolveMaterialVisual } from './materialCatalog'

describe('material visual catalog', () => {
  it('covers every unique cart code that has a description', () => {
    const expected = new Map<string, string>()
    for (const cart of defaultCarts) {
      for (const item of cart.items) {
        if (item.descritivo?.trim() && !expected.has(normalizeSearch(item.codigo))) {
          expected.set(normalizeSearch(item.codigo), item.descritivo.trim())
        }
      }
    }

    expect(expected.size).toBe(114)
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

    expect(uncertain).toEqual(['ITL98400023', 'ITLGHB00078', 'J9900000900'])
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

  it('renders the photographed 016/017 hardware with the correct geometry and finish', () => {
    expect(resolveMaterialVisual('ITPFPHM506ESBC')).toMatchObject({
      family: 'countersunk-screw', finish: 'bichromate', verified: true,
    })
    expect(resolveMaterialVisual('ITPRCSEM03BC')).toMatchObject({
      family: 'hex-nut', finish: 'bichromate', verified: true,
    })
    expect(resolveMaterialVisual('ITARSRM003AI6')).toMatchObject({
      family: 'serrated-washer', finish: 'stainless', verified: true,
    })
  })

  it('classifies the GHB hardware without inventing geometry for the reflector shim', () => {
    expect(resolveMaterialVisual('ITPFALLM516AI4')).toMatchObject({
      family: 'socket-screw', finish: 'stainless', verified: true,
    })
    expect(resolveMaterialVisual('ITPFPHM516PAAI6')).toMatchObject({
      family: 'pan-screw', finish: 'stainless', verified: true,
    })
    expect(resolveMaterialVisual('ITLGHB00078')).toMatchObject({
      family: 'unavailable', verified: false,
    })
  })

  it('classifies the photographed ERV hardware without inventing geometry', () => {
    expect(resolveMaterialVisual('ITPFALLM418AI4')).toMatchObject({
      family: 'socket-screw', finish: 'stainless', verified: true,
    })
    expect(resolveMaterialVisual('ITPFSEM820BC')).toMatchObject({
      family: 'hex-bolt', finish: 'bichromate', verified: true,
    })
    expect(resolveMaterialVisual('ITTEOL00010')).toMatchObject({
      family: 'ring-terminal', finish: 'yellow', verified: true,
    })
    expect(resolveMaterialVisual('ITPFPHM535CIAI4')).toMatchObject({
      family: 'cylindrical-phillips-screw', finish: 'stainless', verified: true,
    })
    expect(resolveMaterialVisual('ITRKCHFE001')).toMatchObject({
      family: 'rivnut-smooth-closed', finish: 'stainless', sizeLabel: 'M5 × 19,3 mm', verified: true,
    })
    expect(resolveMaterialVisual('ITRKCHFE013')).toMatchObject({
      family: 'rivnut-closed', finish: 'stainless', sizeLabel: 'M4 × 16 mm', verified: true,
    })
  })
})
