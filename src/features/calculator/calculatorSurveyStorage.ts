import type { CalculatorHistoryRecord, RoundingPolicy } from './calculatorTypes'

export const CALCULATOR_SURVEYS_STORAGE_KEY = 'bombonacalc_levantamentos_v1'
const SURVEY_SCHEMA_VERSION = 2
const SURVEY_LIMIT = 100
const ITEM_LIMIT_PER_SURVEY = 3000

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface CalculatorSurveyItem {
  id: string
  codigo: string
  descritivo: string
  endereco: string
  quantidade: number
  criadoEm: string
  atualizadoEm: string
  calculo: {
    recipienteNome: string
    taraKg: number
    pesoBrutoKg: number
    pesoLiquidoKg: number
    gramaturaG: number
    taxaRendimento: number
    politicaArredondamento: RoundingPolicy
  }
}

export interface CalculatorSurvey {
  id: string
  nome: string
  criadoEm: string
  atualizadoEm: string
  itens: CalculatorSurveyItem[]
}

export interface CalculatorSurveyState {
  schema: number
  levantamentoAtivoId: string | null
  levantamentos: CalculatorSurvey[]
}

export class CalculatorSurveyStorageError extends Error {}

function defaultStorage(): StorageAdapter {
  if (typeof localStorage === 'undefined') {
    throw new CalculatorSurveyStorageError('O armazenamento local dos levantamentos não está disponível.')
  }
  return localStorage
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCode(value: unknown): string {
  return normalizeText(value).toLocaleUpperCase('pt-BR')
}

function normalizeAddress(value: unknown): string {
  return normalizeText(value).toLocaleUpperCase('pt-BR')
}

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeItem(value: unknown): CalculatorSurveyItem | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const calc = source.calculo && typeof source.calculo === 'object' ? source.calculo as Record<string, unknown> : {}
  const codigo = normalizeCode(source.codigo)
  if (!codigo) return null
  const quantidade = Math.max(0, Math.floor(safeNumber(source.quantidade)))
  const now = new Date().toISOString()
  return {
    id: normalizeText(source.id) || createId('item'),
    codigo,
    descritivo: normalizeText(source.descritivo),
    endereco: normalizeAddress(source.endereco),
    quantidade,
    criadoEm: normalizeText(source.criadoEm) || now,
    atualizadoEm: normalizeText(source.atualizadoEm) || normalizeText(source.criadoEm) || now,
    calculo: {
      recipienteNome: normalizeText(calc.recipienteNome),
      taraKg: Math.max(0, safeNumber(calc.taraKg)),
      pesoBrutoKg: Math.max(0, safeNumber(calc.pesoBrutoKg)),
      pesoLiquidoKg: Math.max(0, safeNumber(calc.pesoLiquidoKg)),
      gramaturaG: Math.max(0, safeNumber(calc.gramaturaG)),
      taxaRendimento: Math.max(0, safeNumber(calc.taxaRendimento, 0.95)),
      politicaArredondamento: calc.politicaArredondamento === 'arredondar' ? 'arredondar' : 'truncar',
    },
  }
}

function normalizeSurvey(value: unknown): CalculatorSurvey | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const nome = normalizeText(source.nome)
  if (!nome) return null
  const now = new Date().toISOString()
  const itens = Array.isArray(source.itens)
    ? source.itens.map(normalizeItem).filter((item): item is CalculatorSurveyItem => Boolean(item)).slice(0, ITEM_LIMIT_PER_SURVEY)
    : []
  return {
    id: normalizeText(source.id) || createId('levantamento'),
    nome,
    criadoEm: normalizeText(source.criadoEm) || now,
    atualizadoEm: normalizeText(source.atualizadoEm) || normalizeText(source.criadoEm) || now,
    itens,
  }
}

function emptyState(): CalculatorSurveyState {
  return { schema: SURVEY_SCHEMA_VERSION, levantamentoAtivoId: null, levantamentos: [] }
}

function normalizeState(value: unknown): CalculatorSurveyState {
  if (!value || typeof value !== 'object') return emptyState()
  const source = value as Record<string, unknown>
  const levantamentos = Array.isArray(source.levantamentos)
    ? source.levantamentos.map(normalizeSurvey).filter((survey): survey is CalculatorSurvey => Boolean(survey)).slice(0, SURVEY_LIMIT)
    : []
  const requested = normalizeText(source.levantamentoAtivoId)
  return {
    schema: SURVEY_SCHEMA_VERSION,
    levantamentoAtivoId: levantamentos.some(survey => survey.id === requested) ? requested : levantamentos[0]?.id ?? null,
    levantamentos,
  }
}

function migratedState(history: CalculatorHistoryRecord[]): CalculatorSurveyState {
  const usable = history.filter(record => record.identificacao.produtoId.trim())
  if (!usable.length) return emptyState()
  const now = new Date().toISOString()
  const surveyId = createId('levantamento')
  return {
    schema: SURVEY_SCHEMA_VERSION,
    levantamentoAtivoId: surveyId,
    levantamentos: [{
      id: surveyId,
      nome: 'Histórico anterior',
      criadoEm: now,
      atualizadoEm: now,
      itens: usable.slice(0, ITEM_LIMIT_PER_SURVEY).map(record => ({
        id: record.id || createId('item'),
        codigo: normalizeCode(record.identificacao.produtoId),
        descritivo: '',
        endereco: normalizeAddress(record.identificacao.endereco),
        quantidade: Math.max(0, Math.floor(record.calculo.quantidadeFinal)),
        criadoEm: record.criadoEm || now,
        atualizadoEm: record.auditoria.atualizadoEm || record.criadoEm || now,
        calculo: {
          recipienteNome: record.recipiente.nome,
          taraKg: record.recipiente.taraKg,
          pesoBrutoKg: record.entrada.pesoBrutoKg,
          pesoLiquidoKg: record.calculo.pesoLiquidoKg,
          gramaturaG: record.entrada.gramaturaG,
          taxaRendimento: record.calculo.taxaRendimento,
          politicaArredondamento: record.calculo.politicaArredondamento,
        },
      })),
    }],
  }
}

export function saveCalculatorSurveyState(state: CalculatorSurveyState, storage = defaultStorage()): CalculatorSurveyState {
  const normalized = normalizeState(state)
  try {
    storage.setItem(CALCULATOR_SURVEYS_STORAGE_KEY, JSON.stringify(normalized))
  } catch (error) {
    throw new CalculatorSurveyStorageError('Não foi possível salvar os levantamentos neste dispositivo.', { cause: error })
  }
  return normalized
}

export function loadCalculatorSurveyState(history: CalculatorHistoryRecord[] = [], storage = defaultStorage()): CalculatorSurveyState {
  const raw = storage.getItem(CALCULATOR_SURVEYS_STORAGE_KEY)
  if (!raw) return saveCalculatorSurveyState(migratedState(history), storage)
  try {
    return saveCalculatorSurveyState(normalizeState(JSON.parse(raw) as unknown), storage)
  } catch {
    return saveCalculatorSurveyState(emptyState(), storage)
  }
}

function updateSurveyState(
  mutation: (draft: CalculatorSurveyState) => void,
  storage = defaultStorage(),
): CalculatorSurveyState {
  const current = loadCalculatorSurveyState([], storage)
  const draft = JSON.parse(JSON.stringify(current)) as CalculatorSurveyState
  mutation(draft)
  return saveCalculatorSurveyState(draft, storage)
}

export function createCalculatorSurvey(nome: string, storage = defaultStorage()): CalculatorSurveyState {
  const cleanName = normalizeText(nome)
  if (!cleanName) throw new CalculatorSurveyStorageError('Informe o nome da rua ou do levantamento.')
  const now = new Date().toISOString()
  const survey: CalculatorSurvey = { id: createId('levantamento'), nome: cleanName, criadoEm: now, atualizadoEm: now, itens: [] }
  return updateSurveyState(state => {
    state.levantamentos = [survey, ...state.levantamentos].slice(0, SURVEY_LIMIT)
    state.levantamentoAtivoId = survey.id
  }, storage)
}

export function selectCalculatorSurvey(id: string, storage = defaultStorage()): CalculatorSurveyState {
  return updateSurveyState(state => {
    if (state.levantamentos.some(survey => survey.id === id)) state.levantamentoAtivoId = id
  }, storage)
}

export function removeCalculatorSurvey(id: string, storage = defaultStorage()): CalculatorSurveyState {
  return updateSurveyState(state => {
    state.levantamentos = state.levantamentos.filter(survey => survey.id !== id)
    if (state.levantamentoAtivoId === id) state.levantamentoAtivoId = state.levantamentos[0]?.id ?? null
  }, storage)
}

export function upsertCalculatorSurveyItem(
  surveyId: string,
  item: CalculatorSurveyItem,
  storage = defaultStorage(),
): CalculatorSurveyState {
  return updateSurveyState(state => {
    const survey = state.levantamentos.find(candidate => candidate.id === surveyId)
    if (!survey) throw new CalculatorSurveyStorageError('O levantamento selecionado não existe mais.')
    const normalized = normalizeItem(item)
    if (!normalized) throw new CalculatorSurveyStorageError('O código do produto é obrigatório.')
    const existingIndex = survey.itens.findIndex(candidate => candidate.codigo === normalized.codigo)
    if (existingIndex >= 0) {
      normalized.id = survey.itens[existingIndex].id
      normalized.criadoEm = survey.itens[existingIndex].criadoEm
      survey.itens[existingIndex] = normalized
    } else {
      survey.itens.push(normalized)
      survey.itens = survey.itens.slice(-ITEM_LIMIT_PER_SURVEY)
    }
    survey.atualizadoEm = normalized.atualizadoEm
  }, storage)
}

export function updateCalculatorSurveyItem(
  surveyId: string,
  itemId: string,
  patch: Pick<CalculatorSurveyItem, 'codigo' | 'descritivo' | 'endereco' | 'quantidade'>,
  storage = defaultStorage(),
): CalculatorSurveyState {
  return updateSurveyState(state => {
    const survey = state.levantamentos.find(candidate => candidate.id === surveyId)
    if (!survey) throw new CalculatorSurveyStorageError('O levantamento selecionado não existe mais.')
    const index = survey.itens.findIndex(candidate => candidate.id === itemId)
    if (index < 0) throw new CalculatorSurveyStorageError('O item não foi encontrado.')
    const codigo = normalizeCode(patch.codigo)
    if (!codigo) throw new CalculatorSurveyStorageError('Informe o código do produto.')
    if (survey.itens.some((candidate, candidateIndex) => candidateIndex !== index && candidate.codigo === codigo)) {
      throw new CalculatorSurveyStorageError('Esse código já existe no levantamento atual.')
    }
    const now = new Date().toISOString()
    survey.itens[index] = {
      ...survey.itens[index],
      codigo,
      descritivo: normalizeText(patch.descritivo),
      endereco: normalizeAddress(patch.endereco),
      quantidade: Math.max(0, Math.floor(safeNumber(patch.quantidade))),
      atualizadoEm: now,
    }
    survey.atualizadoEm = now
  }, storage)
}

export function removeCalculatorSurveyItem(
  surveyId: string,
  itemId: string,
  storage = defaultStorage(),
): CalculatorSurveyState {
  return updateSurveyState(state => {
    const survey = state.levantamentos.find(candidate => candidate.id === surveyId)
    if (!survey) return
    survey.itens = survey.itens.filter(item => item.id !== itemId)
    survey.atualizadoEm = new Date().toISOString()
  }, storage)
}

export function clearCalculatorSurveys(storage = defaultStorage()): CalculatorSurveyState {
  const next = emptyState()
  try {
    storage.removeItem(CALCULATOR_SURVEYS_STORAGE_KEY)
  } catch {
    // saveCalculatorSurveyState below will surface a useful write error when needed.
  }
  return saveCalculatorSurveyState(next, storage)
}
