export type RoundingPolicy = 'truncar' | 'arredondar'

export type CalculatorErrorCode =
  | 'DADOS_INCOMPLETOS'
  | 'RECIPIENTE_INVALIDO'
  | 'PESO_INVALIDO'
  | 'GRAMATURA_INVALIDA'
  | 'PESO_MENOR_QUE_TARA'
  | 'RENDIMENTO_INVALIDO'
  | 'ARREDONDAMENTO_INVALIDO'

export interface CalculatorContainer {
  id: string
  nome: string
  taraKg: number
  cor: string
  ativo: boolean
}

export interface CalculatorSettings {
  tema: 'system' | 'light' | 'dark'
  recipientePadraoId: string
  taxaRendimento: number
  politicaArredondamento: RoundingPolicy
}

export interface CalculatorAuditChange {
  em: string
  anterior: {
    produtoId: string
    endereco: string
    quantidadeFinal: number
  }
  atual: {
    produtoId: string
    endereco: string
    quantidadeFinal: number
  }
}

export interface CalculatorHistoryRecord {
  id: string
  criadoEm: string
  identificacao: {
    produtoId: string
    endereco: string
  }
  recipiente: CalculatorContainer
  entrada: {
    pesoBrutoKg: number
    gramaturaG: number
  }
  calculo: {
    pesoLiquidoKg: number
    quantidadeEstimada?: number
    quantidadeComRendimento?: number
    taxaRendimento: number
    politicaArredondamento: RoundingPolicy
    quantidadeCalculadaOriginal: number
    quantidadeFinal: number
    versaoFormula: number
  }
  auditoria: {
    atualizadoEm: string | null
    revisao: number
    alteracoes: CalculatorAuditChange[]
  }
  versaoAplicativo: string
}

export interface CalculatorState {
  schema: number
  versaoAplicativo: string
  configuracoes: CalculatorSettings
  recipientes: CalculatorContainer[]
  historico: CalculatorHistoryRecord[]
}

export interface CalculationDetails {
  pesoBrutoKg: number
  taraKg: number
  pesoLiquidoKg: number
  gramaturaG: number
  taxaRendimento: number
  politicaArredondamento: RoundingPolicy
  quantidadeEstimada: number
  quantidadeComRendimento: number
  quantidadeFinal: number
}

export type CalculationResult =
  | {
      sucesso: true
      codigoErro: null
      mensagem: null
      campoErro: null
      resultado: number
      detalhes: CalculationDetails
    }
  | {
      sucesso: false
      codigoErro: CalculatorErrorCode
      mensagem: string
      campoErro: 'pesoBruto' | 'gramatura' | null
      resultado: 0
      detalhes: null
    }
