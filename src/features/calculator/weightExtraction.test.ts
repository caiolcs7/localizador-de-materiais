import { describe, expect, it } from 'vitest'
import { extractWeightFromDescription, formatGramsInput } from './weightExtraction'

describe('extractWeightFromDescription', () => {
  it.each([
    ['PARAFUSO M4 X 20 0,00061 KG', 0.61],
    ['PORCA M8 0,003 KG', 3],
    ['ARRUELA 10MM 1,2 G', 1.2],
    ['ITEM 41 GR', 41],
    ['ITEM 0.041 KG', 41],
    ['ITEM 0,041 KG', 41],
    ['ITEM 0,012 quilograma', 12],
    ['ITEM 12,5 gramas', 12.5],
    ['ITEM 1,5 kg', 1500],
  ])('extrai a gramatura de %s', (description, expectedGrams) => {
    const result = extractWeightFromDescription(description)
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.grams).toBe(expectedGrams)
  })

  it.each([
    'PARAFUSO M6 X 30',
    'ITEM 12345',
    'ARRUELA 10MM',
    '',
  ])('não trata medidas ou códigos como peso: %s', description => {
    expect(extractWeightFromDescription(description)).toEqual({ valid: false, reason: 'not-found' })
  })

  it('não escolhe arbitrariamente quando há pesos diferentes', () => {
    expect(extractWeightFromDescription('PESO BRUTO 1 KG, PESO UN 3 G')).toEqual({
      valid: false,
      reason: 'ambiguous',
    })
  })

  it('aceita a repetição inequívoca do mesmo peso', () => {
    const result = extractWeightFromDescription('PESO UN 0,003 KG / CONFIRMADO 3 G')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.grams).toBe(3)
  })

  it('formata o número para edição em português sem adicionar unidade', () => {
    expect(formatGramsInput(0.61)).toBe('0,61')
  })
})
