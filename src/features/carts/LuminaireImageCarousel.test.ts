import { describe, expect, it } from 'vitest'
import { resolveCarouselFrameRatio } from './LuminaireImageCarousel'

describe('geometria do carrossel de luminárias', () => {
  it('mantém o quadro padrão enquanto as imagens ainda estão carregando', () => {
    expect(resolveCarouselFrameRatio(3, { 0: 1, 1: 1600 / 819 })).toBe(1.6)
  })

  it('usa uma única proporção estável para fotos quadradas e panorâmicas', () => {
    const ratios = { 0: 1, 1: 1600 / 819, 2: 1 }
    const frameRatio = resolveCarouselFrameRatio(3, ratios)

    expect(frameRatio).toBeCloseTo(1600 / 819)
    expect(frameRatio).toBe(resolveCarouselFrameRatio(3, ratios))
  })

  it('ignora proporções inválidas até que todo o conjunto seja válido', () => {
    expect(resolveCarouselFrameRatio(2, { 0: 1, 1: Number.NaN })).toBe(1.6)
  })
})
