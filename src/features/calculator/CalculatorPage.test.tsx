import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CalculatorPage } from './CalculatorPage'

describe('CalculatorPage', () => {
  it('renderiza a calculadora integrada com os quatro recipientes e histórico', () => {
    const html = renderToString(<CalculatorPage onBackHome={() => undefined}/>)
    expect(html).toContain('Calculadora')
    expect(html).toContain('Bombona Azul')
    expect(html).toContain('Bombona Marrom')
    expect(html).toContain('Caixa Vermelha')
    expect(html).toContain('Galão')
    expect(html).toContain('Histórico')
    expect(html).toContain('Salvar no histórico')
  })
})
