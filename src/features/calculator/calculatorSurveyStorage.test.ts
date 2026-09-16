import { describe, expect, it } from 'vitest'
import {
  CALCULATOR_SURVEYS_STORAGE_KEY,
  createCalculatorSurvey,
  loadCalculatorSurveyState,
  removeCalculatorSurveyItem,
  selectCalculatorSurvey,
  updateCalculatorSurveyItem,
  upsertCalculatorSurveyItem,
  type CalculatorSurveyItem,
} from './calculatorSurveyStorage'

function createStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

function createItem(code: string, quantity: number, address = 'R14A2C05'): CalculatorSurveyItem {
  const now = '2026-09-16T12:00:00.000Z'
  return {
    id: `item-${code}-${quantity}`,
    codigo: code,
    descritivo: `Descrição ${code}`,
    endereco: address,
    quantidade: quantity,
    criadoEm: now,
    atualizadoEm: now,
    calculo: {
      recipienteNome: 'Bombona Azul',
      taraKg: 6.4,
      pesoBrutoKg: 20,
      pesoLiquidoKg: 13.6,
      gramaturaG: 10,
      taxaRendimento: 0.95,
      politicaArredondamento: 'truncar',
    },
  }
}

describe('calculatorSurveyStorage', () => {
  it('mantém vários levantamentos e preserva a seleção ativa', () => {
    const storage = createStorage()
    const firstState = createCalculatorSurvey('R01', storage)
    const r01 = firstState.levantamentos[0]
    expect(r01.nome).toBe('R01')

    const secondState = createCalculatorSurvey('R02', storage)
    expect(secondState.levantamentos).toHaveLength(2)
    expect(secondState.levantamentoAtivoId).toBe(secondState.levantamentos[0].id)

    const selected = selectCalculatorSurvey(r01.id, storage)
    expect(selected.levantamentoAtivoId).toBe(r01.id)
    expect(loadCalculatorSurveyState([], storage).levantamentoAtivoId).toBe(r01.id)
  })

  it('atualiza a nova quantidade e o endereço quando o mesmo código é salvo novamente', () => {
    const storage = createStorage()
    const created = createCalculatorSurvey('R14A1', storage)
    const surveyId = created.levantamentoAtivoId!

    upsertCalculatorSurveyItem(surveyId, createItem('itpfphm408paai4', 100, 'R14A1C01'), storage)
    const updated = upsertCalculatorSurveyItem(surveyId, createItem('ITPFPHM408PAAI4', 250, 'R14A1C09'), storage)
    const items = updated.levantamentos.find(survey => survey.id === surveyId)!.itens

    expect(items).toHaveLength(1)
    expect(items[0].codigo).toBe('ITPFPHM408PAAI4')
    expect(items[0].quantidade).toBe(250)
    expect(items[0].endereco).toBe('R14A1C09')
  })

  it('permite editar endereço e remover um item sem afetar os demais', () => {
    const storage = createStorage()
    const created = createCalculatorSurvey('R03', storage)
    const surveyId = created.levantamentoAtivoId!
    let state = upsertCalculatorSurveyItem(surveyId, createItem('COD001', 10), storage)
    state = upsertCalculatorSurveyItem(surveyId, createItem('COD002', 20), storage)
    const firstItem = state.levantamentos[0].itens.find(item => item.codigo === 'COD001')!

    state = updateCalculatorSurveyItem(surveyId, firstItem.id, {
      codigo: 'COD001',
      descritivo: 'Descrição revisada',
      endereco: 'R03A1C22',
      quantidade: 33,
    }, storage)
    const edited = state.levantamentos[0].itens.find(item => item.codigo === 'COD001')
    expect(edited?.quantidade).toBe(33)
    expect(edited?.endereco).toBe('R03A1C22')

    state = removeCalculatorSurveyItem(surveyId, firstItem.id, storage)
    expect(state.levantamentos[0].itens.map(item => item.codigo)).toEqual(['COD002'])
  })

  it('migra levantamentos antigos sem endereço sem perder os itens', () => {
    const storage = createStorage()
    storage.setItem(CALCULATOR_SURVEYS_STORAGE_KEY, JSON.stringify({
      schema: 1,
      levantamentoAtivoId: 'legacy',
      levantamentos: [{
        id: 'legacy',
        nome: 'R07',
        criadoEm: '2026-09-15T12:00:00.000Z',
        atualizadoEm: '2026-09-15T12:00:00.000Z',
        itens: [{
          id: 'legacy-item',
          codigo: 'codlegacy',
          descritivo: 'Item antigo',
          quantidade: 12,
          criadoEm: '2026-09-15T12:00:00.000Z',
          atualizadoEm: '2026-09-15T12:00:00.000Z',
          calculo: {},
        }],
      }],
    }))

    const state = loadCalculatorSurveyState([], storage)
    expect(state.schema).toBe(2)
    expect(state.levantamentos[0].itens[0].codigo).toBe('CODLEGACY')
    expect(state.levantamentos[0].itens[0].endereco).toBe('')
  })
})
