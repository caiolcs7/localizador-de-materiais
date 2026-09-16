import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CalculatorPage } from './CalculatorPage'

describe('CalculatorPage', () => {
  it('renderiza a calculadora integrada com recipientes, leitor e levantamentos', () => {
    const html = renderToString(<CalculatorPage onBackHome={() => undefined}/>)
    expect(html).toContain('Calculadora')
    expect(html).toContain('Bombona Azul')
    expect(html).toContain('Bombona Marrom')
    expect(html).toContain('Caixa Vermelha')
    expect(html).toContain('Galão')
    expect(html).toContain('Levantamentos')
    expect(html).toContain('Salvar no levantamento')
    expect(html).toContain('Ler Data Matrix')
    expect(html).toContain('Exportar Excel')
    expect(html).not.toContain('Salvar no histórico')
  })
})
