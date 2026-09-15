import { describe, expect, it } from 'vitest'
import { inferMaterialDescription, matchesMaterialSearch } from './materialCode'
import { resolveMaterialVisual } from './materialCatalog'

describe('material code grammar', () => {
  it('decodes metric Phillips screws', () => {
    expect(inferMaterialDescription('ITPFPHM420PAAI4')).toBe('PARAFUSO AI PHILLIPS CAB PAN M4 20MM')
    expect(inferMaterialDescription('ITPFPHM1020PAI4')).toBe('PARAFUSO AI PHILLIPS M10 20MM')
  })

  it('decodes non-metric self-tapping Phillips screws', () => {
    expect(inferMaterialDescription('ITPFPH3913AEAI4')).toBe('PARAFUSO AI PHILLIPS CAB ESC 3,9 MM 13MM AUTO ATARR')
  })

  it('treats Allen as cylindrical by default', () => {
    expect(inferMaterialDescription('ITPFALLM520AI4')).toBe('PARAFUSO AI ALLEN CAB CILINDRICA M5 20MM')
  })

  it('decodes washers and nuts', () => {
    expect(inferMaterialDescription('ITARLSM004AI6')).toBe('ARRUELA LISA AI 316 M4')
    expect(inferMaterialDescription('ITPRCSEM04AI4')).toBe('PORCA AI SEXTAVADA M4')
  })

  it('does not invent details for unknown legacy families', () => {
    expect(inferMaterialDescription('ITRKCHFE002')).toBe('RIVKLE CAB CHATA, FECHADO - ESPECIFICAÇÃO TÉCNICA NÃO CONFIRMADA')
    expect(inferMaterialDescription('J9900000856')).toBe('DESCRITIVO TÉCNICO NÃO IDENTIFICADO COM SEGURANÇA')
  })

  it('renders FENDA with a slotted drive and keeps underspecified Rivkle unverified', () => {
    expect(resolveMaterialVisual('ITPFFEM318CIAI4')).toMatchObject({ family: 'slotted-cylindrical-screw', finish: 'stainless', verified: true })
    expect(resolveMaterialVisual('ITPFFE3916APAI4')).toMatchObject({ family: 'self-tapping-slotted-pan-screw', finish: 'stainless', verified: true })
    expect(resolveMaterialVisual('ITRKCHFE002')).toMatchObject({ family: 'unavailable', verified: false })
  })

  it('matches technical characteristics independent of word order and punctuation', () => {
    const description = 'PARAFUSO AI PHILLIPS CAB PAN M4 20MM'
    expect(matchesMaterialSearch('ITPFPHM420PAAI4', description, 'm4 x 20')).toBe(true)
    expect(matchesMaterialSearch('ITPFPHM420PAAI4', description, 'm4 x 20 cab pan ai phillips')).toBe(true)
    expect(matchesMaterialSearch('ITPFPHM420PAAI4', description, 'phillips cabeça panela inox 304 m4x20')).toBe(true)
    expect(matchesMaterialSearch('ITPFPHM420PAAI4', description, 'm4 x 10')).toBe(false)
  })

  it('finds items by singular or plural description terms', () => {
    expect(matchesMaterialSearch('CC100000052', 'CABO FLEX VD 2,50MM 105 C 750V ISOL. PVC', 'cabo')).toBe(true)
    expect(matchesMaterialSearch('CC100000052', 'CABO FLEX VD 2,50MM 105 C 750V ISOL. PVC', 'cabos')).toBe(true)
    expect(matchesMaterialSearch('ITPFPHM420PAAI4', 'PARAFUSO AI PHILLIPS CAB PAN M4 20MM', 'parafusos')).toBe(true)
  })
})
