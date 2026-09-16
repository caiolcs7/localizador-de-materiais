import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CalculatorPage } from './CalculatorPage'
import { CALCULATOR_SURVEYS_STORAGE_KEY } from './calculatorSurveyStorage'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => Array.from(values.keys())[index] ?? null,
    removeItem: key => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('CalculatorPage', () => {
  it('renderiza a calculadora integrada com recipientes, leitor e levantamentos', () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const storage = createMemoryStorage()
    storage.setItem(CALCULATOR_SURVEYS_STORAGE_KEY, JSON.stringify({
      schema: 1,
      levantamentoAtivoId: 'levantamento-r01',
      levantamentos: [{
        id: 'levantamento-r01',
        nome: 'R01',
        criadoEm: '2026-09-16T12:00:00.000Z',
        atualizadoEm: '2026-09-16T12:00:00.000Z',
        itens: [],
      }],
    }))
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })

    try {
      const html = renderToString(<CalculatorPage onBackHome={() => undefined}/>)
      expect(html).toContain('Calculadora')
      expect(html).toContain('Bombona Azul')
      expect(html).toContain('Bombona Marrom')
      expect(html).toContain('Caixa Vermelha')
      expect(html).toContain('Galão')
      expect(html).toContain('Levantamentos')
      expect(html).toContain('R01')
      expect(html).toContain('Salvar no levantamento')
      expect(html).toContain('Ler Data Matrix')
      expect(html).toContain('Exportar Excel')
      expect(html).not.toContain('Salvar no histórico')
    } finally {
      if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
})
