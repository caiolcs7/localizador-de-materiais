import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONTAINERS } from './calculatorLogic'
import {
  CALCULATOR_STORAGE_KEY,
  addCalculatorHistory,
  loadCalculatorState,
  removeCalculatorHistoryRecord,
  replaceCalculatorHistoryRecord,
  restoreCalculatorHistoryRecord,
  saveCalculatorPreferences,
} from './calculatorStorage'
import type { CalculatorHistoryRecord } from './calculatorTypes'

class MemoryStorage {
  private data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, String(value)) }
  removeItem(key: string) { this.data.delete(key) }
  clear() { this.data.clear() }
}

const storage = new MemoryStorage()

function historyRecord(): CalculatorHistoryRecord {
  return {
    id: 'calculo-1',
    criadoEm: '2026-09-03T12:00:00.000Z',
    identificacao: { produtoId: 'PROD-10', endereco: 'R13B054' },
    recipiente: { ...DEFAULT_CONTAINERS[0] },
    entrada: { pesoBrutoKg: 20, gramaturaG: 50 },
    calculo: {
      pesoLiquidoKg: 13.6,
      quantidadeEstimada: 272,
      quantidadeComRendimento: 258.4,
      taxaRendimento: 0.95,
      politicaArredondamento: 'truncar',
      quantidadeCalculadaOriginal: 258,
      quantidadeFinal: 258,
      versaoFormula: 1,
    },
    auditoria: { atualizadoEm: null, revisao: 0, alteracoes: [] },
    versaoAplicativo: '4.2.1-integrated',
  }
}

describe('calculatorStorage', () => {
  beforeEach(() => storage.clear())

  it('inicia com os quatro recipientes originais e Bombona Azul como padrão', () => {
    const state = loadCalculatorState(storage)
    expect(state.recipientes).toHaveLength(4)
    expect(state.recipientes[0].nome).toBe('Bombona Azul')
    expect(state.configuracoes.recipientePadraoId).toBe('bombona-azul')
  })

  it('mantém o histórico intacto até o salvamento explícito', () => {
    expect(loadCalculatorState(storage).historico).toHaveLength(0)
    expect(addCalculatorHistory(historyRecord(), storage).historico).toHaveLength(1)
  })

  it('migra os dados antigos da bombona branca para a Bombona Azul', () => {
    storage.setItem('bombonacalc_settings', JSON.stringify({ defaultBombona: 'branca' }))
    storage.setItem('bombonacalc_history', JSON.stringify([
      { id: 'antigo', tipoBombona: 'branca', pesoBruto: 10, gramatura: 50, resultado: 68 },
    ]))
    const state = loadCalculatorState(storage)
    expect(state.configuracoes.recipientePadraoId).toBe('bombona-azul')
    expect(state.historico[0].recipiente.nome).toBe('Bombona Azul')
  })

  it('normaliza ID e endereço antigos para letras maiúsculas', () => {
    const record = historyRecord()
    record.identificacao = { produtoId: 'prod-abc', endereco: 'rua a-10' }
    storage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify({
      schema: 4,
      configuracoes: {},
      recipientes: DEFAULT_CONTAINERS,
      historico: [record],
    }))
    const state = loadCalculatorState(storage)
    expect(state.historico[0].identificacao).toEqual({ produtoId: 'PROD-ABC', endereco: 'RUA A-10' })
  })

  it('preserva o valor calculado original e a auditoria ao editar', () => {
    addCalculatorHistory(historyRecord(), storage)
    const result = replaceCalculatorHistoryRecord('calculo-1', record => {
      record.identificacao.produtoId = 'PROD-11'
      record.calculo.quantidadeFinal = 255
      record.auditoria.revisao = 1
      record.auditoria.atualizadoEm = '2026-09-03T13:00:00.000Z'
    }, storage)
    expect(result.record?.identificacao.produtoId).toBe('PROD-11')
    expect(result.record?.calculo.quantidadeFinal).toBe(255)
    expect(result.record?.calculo.quantidadeCalculadaOriginal).toBe(258)
    expect(result.record?.auditoria.revisao).toBe(1)
  })

  it('remove e restaura um registro sem duplicá-lo', () => {
    addCalculatorHistory(historyRecord(), storage)
    const removed = removeCalculatorHistoryRecord('calculo-1', storage)
    expect(removed.state.historico).toHaveLength(0)
    expect(removed.record).not.toBeNull()
    const restored = restoreCalculatorHistoryRecord(removed.record!, storage)
    expect(restored.historico.map(record => record.id)).toEqual(['calculo-1'])
  })

  it('mantém um recipiente padrão válido após desativação ou dado corrompido', () => {
    saveCalculatorPreferences({ recipientePadraoId: 'inexistente' }, storage)
    expect(loadCalculatorState(storage).configuracoes.recipientePadraoId).toBe('bombona-azul')
  })
})
