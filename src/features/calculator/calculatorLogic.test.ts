import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTAINERS,
  calculateProduction,
  parseDecimal,
  sanitizeDecimalInput,
} from './calculatorLogic'

const blueContainer = { ...DEFAULT_CONTAINERS[0] }

describe('calculatorLogic', () => {
  it.each([
    ['6,4', 6.4],
    ['6.4', 6.4],
    ['6,400', 6.4],
    ['6.400', 6.4],
    ['1.250,50', 1250.5],
    ['1,250.50', 1250.5],
    [' 20,750 kg ', 20.75],
  ])('interpreta %s como %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected)
  })

  it('diferencia campo vazio de zero', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('0')).toBe(0)
  })

  it('mantém apenas um separador decimal durante a digitação', () => {
    expect(sanitizeDecimalInput('1.2,3')).toBe('12,3')
  })

  it('aplica a fórmula e mantém somente unidades completas', () => {
    const result = calculateProduction({
      pesoBrutoKg: 20,
      gramaturaG: 50,
      recipiente: blueContainer,
      taxaRendimento: 0.95,
      politicaArredondamento: 'truncar',
    })
    expect(result.sucesso).toBe(true)
    expect(result.resultado).toBe(258)
    if (result.sucesso) expect(result.detalhes.pesoLiquidoKg).toBe(13.6)
  })

  it('aceita peso igual à tara e retorna zero', () => {
    const result = calculateProduction({ pesoBrutoKg: 6.4, gramaturaG: 50, recipiente: blueContainer })
    expect(result.sucesso).toBe(true)
    expect(result.resultado).toBe(0)
  })

  it('rejeita peso menor que a tara com a mensagem fornecida', () => {
    const result = calculateProduction({ pesoBrutoKg: 5, gramaturaG: 50, recipiente: blueContainer })
    expect(result.sucesso).toBe(false)
    expect(result.codigoErro).toBe('PESO_MENOR_QUE_TARA')
    expect(result.campoErro).toBe('pesoBruto')
    expect(result.mensagem).toBe('Valor adicionado menor que a tara, insira um valor válido.')
  })

  it('aplica arredondamento convencional quando configurado', () => {
    const result = calculateProduction({
      pesoBrutoKg: 10,
      gramaturaG: 64,
      recipiente: { ...blueContainer, taraKg: 1 },
      taxaRendimento: 0.95,
      politicaArredondamento: 'arredondar',
    })
    expect(result.resultado).toBe(134)
  })

  it('rejeita gramatura zero e rendimento fora do intervalo', () => {
    expect(calculateProduction({ pesoBrutoKg: 20, gramaturaG: 0, recipiente: blueContainer }).codigoErro)
      .toBe('GRAMATURA_INVALIDA')
    expect(calculateProduction({ pesoBrutoKg: 20, gramaturaG: 50, recipiente: blueContainer, taxaRendimento: 1.1 }).codigoErro)
      .toBe('RENDIMENTO_INVALIDO')
  })
})
