import type {
  CalculationResult,
  CalculatorContainer,
  CalculatorErrorCode,
  RoundingPolicy,
} from './calculatorTypes'

export const CALCULATOR_APP_VERSION = '4.2.1-integrated'
export const CALCULATOR_FORMULA_VERSION = 1
export const DEFAULT_YIELD = 0.95
export const DEFAULT_ROUNDING_POLICY: RoundingPolicy = 'truncar'

export const DEFAULT_CONTAINERS: ReadonlyArray<CalculatorContainer> = Object.freeze([
  { id: 'bombona-azul', nome: 'Bombona Azul', taraKg: 6.4, cor: '#2563eb', ativo: true },
  { id: 'bombona-marrom', nome: 'Bombona Marrom', taraKg: 9.2, cor: '#8b5a2b', ativo: true },
  { id: 'caixa-vermelha', nome: 'Caixa Vermelha', taraKg: 3, cor: '#ef4444', ativo: true },
  { id: 'galao', nome: 'Galão', taraKg: 1, cor: '#06b6d4', ativo: true },
])

const ERROR_MESSAGES: Record<CalculatorErrorCode, string> = {
  DADOS_INCOMPLETOS: 'Preencha o peso bruto e a gramatura.',
  RECIPIENTE_INVALIDO: 'Selecione um recipiente válido.',
  PESO_INVALIDO: 'Informe um peso bruto válido.',
  GRAMATURA_INVALIDA: 'A gramatura deve ser maior que zero.',
  PESO_MENOR_QUE_TARA: 'Valor adicionado menor que a tara, insira um valor válido.',
  RENDIMENTO_INVALIDO: 'O rendimento deve ficar entre 1% e 100%.',
  ARREDONDAMENTO_INVALIDO: 'Política de arredondamento inválida.',
}

function failure(
  codigoErro: CalculatorErrorCode,
  campoErro: 'pesoBruto' | 'gramatura' | null = null,
): CalculationResult {
  return {
    sucesso: false,
    codigoErro,
    mensagem: ERROR_MESSAGES[codigoErro],
    campoErro,
    resultado: 0,
    detalhes: null,
  }
}

export function parseDecimal(value: unknown): number | null {
  const text = String(value ?? '').trim().replace(/\s+/g, '')
  if (!text) return null

  const clean = text.replace(/[^0-9,.-]/g, '')
  if (!clean || !/[0-9]/.test(clean)) return Number.NaN

  const negative = clean.startsWith('-')
  const body = clean.replace(/-/g, '')
  const lastComma = body.lastIndexOf(',')
  const lastDot = body.lastIndexOf('.')
  let normalized: string

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    normalized = body
      .replaceAll(thousandsSeparator, '')
      .replace(decimalSeparator, '.')
  } else if (lastComma >= 0) {
    const parts = body.split(',')
    normalized = parts.length === 2
      ? `${parts[0]}.${parts[1]}`
      : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`
  } else if (lastDot >= 0) {
    const parts = body.split('.')
    normalized = parts.length === 2
      ? `${parts[0]}.${parts[1]}`
      : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`
  } else {
    normalized = body
  }

  const parsed = Number(`${negative ? '-' : ''}${normalized}`)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function sanitizeDecimalInput(value: unknown): string {
  const clean = String(value ?? '').replace(/[^0-9,.-]/g, '')
  const sign = clean.startsWith('-') ? '-' : ''
  const unsigned = clean.replace(/-/g, '')
  const separators = [...unsigned].filter(character => character === ',' || character === '.')
  if (separators.length <= 1) return `${sign}${unsigned}`

  const lastSeparatorIndex = Math.max(unsigned.lastIndexOf(','), unsigned.lastIndexOf('.'))
  const integer = unsigned.slice(0, lastSeparatorIndex).replace(/[,.]/g, '')
  const decimal = unsigned.slice(lastSeparatorIndex + 1).replace(/[,.]/g, '')
  return `${sign}${integer},${decimal}`
}

export function calculateProduction({
  pesoBrutoKg,
  gramaturaG,
  recipiente,
  taxaRendimento = DEFAULT_YIELD,
  politicaArredondamento = DEFAULT_ROUNDING_POLICY,
}: {
  pesoBrutoKg: number | null
  gramaturaG: number | null
  recipiente: CalculatorContainer | null
  taxaRendimento?: number
  politicaArredondamento?: RoundingPolicy
}): CalculationResult {
  if (pesoBrutoKg === null || gramaturaG === null) return failure('DADOS_INCOMPLETOS')
  if (!recipiente || !Number.isFinite(recipiente.taraKg)) return failure('RECIPIENTE_INVALIDO')
  if (!Number.isFinite(pesoBrutoKg) || pesoBrutoKg < 0) return failure('PESO_INVALIDO', 'pesoBruto')
  if (!Number.isFinite(gramaturaG) || gramaturaG <= 0) return failure('GRAMATURA_INVALIDA', 'gramatura')
  if (pesoBrutoKg < recipiente.taraKg) return failure('PESO_MENOR_QUE_TARA', 'pesoBruto')
  if (!Number.isFinite(taxaRendimento) || taxaRendimento <= 0 || taxaRendimento > 1) {
    return failure('RENDIMENTO_INVALIDO')
  }
  if (politicaArredondamento !== 'truncar' && politicaArredondamento !== 'arredondar') {
    return failure('ARREDONDAMENTO_INVALIDO')
  }

  const pesoLiquidoKg = pesoBrutoKg - recipiente.taraKg
  const quantidadeEstimada = pesoLiquidoKg * 1000 / gramaturaG
  const quantidadeComRendimento = quantidadeEstimada * taxaRendimento
  const quantidadeFinal = politicaArredondamento === 'arredondar'
    ? Math.round(quantidadeComRendimento)
    : Math.floor(quantidadeComRendimento)

  return {
    sucesso: true,
    codigoErro: null,
    mensagem: null,
    campoErro: null,
    resultado: quantidadeFinal,
    detalhes: {
      pesoBrutoKg,
      taraKg: recipiente.taraKg,
      pesoLiquidoKg,
      gramaturaG,
      taxaRendimento,
      politicaArredondamento,
      quantidadeEstimada,
      quantidadeComRendimento,
      quantidadeFinal,
    },
  }
}

export function formatWeight(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value)
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function createCalculatorId(prefix = 'calculo'): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || createCalculatorId('recipiente')
}
