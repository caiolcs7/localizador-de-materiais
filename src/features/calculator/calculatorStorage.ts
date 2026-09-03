import {
  CALCULATOR_APP_VERSION,
  CALCULATOR_FORMULA_VERSION,
  DEFAULT_CONTAINERS,
  DEFAULT_ROUNDING_POLICY,
  DEFAULT_YIELD,
} from './calculatorLogic'
import type {
  CalculatorAuditChange,
  CalculatorContainer,
  CalculatorHistoryRecord,
  CalculatorSettings,
  CalculatorState,
  RoundingPolicy,
} from './calculatorTypes'

export const CALCULATOR_STORAGE_KEY = 'bombonacalc_estado_v3'
const LEGACY_HISTORY_KEY = 'bombonacalc_history'
const LEGACY_SETTINGS_KEY = 'bombonacalc_settings'
const SCHEMA_VERSION = 4
const HISTORY_LIMIT = 200
const REVISION_LIMIT = 20

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export class CalculatorStorageError extends Error {}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function defaultStorage(): StorageAdapter {
  if (typeof localStorage === 'undefined') {
    throw new CalculatorStorageError('O armazenamento local não está disponível neste dispositivo.')
  }
  return localStorage
}

export function createDefaultCalculatorState(): CalculatorState {
  return {
    schema: SCHEMA_VERSION,
    versaoAplicativo: CALCULATOR_APP_VERSION,
    configuracoes: {
      tema: 'system',
      recipientePadraoId: 'bombona-azul',
      taxaRendimento: DEFAULT_YIELD,
      politicaArredondamento: DEFAULT_ROUNDING_POLICY,
    },
    recipientes: DEFAULT_CONTAINERS.map(container => ({ ...container })),
    historico: [],
  }
}

function readJson(storage: StorageAdapter, key: string): unknown {
  const value = storage.getItem(key)
  if (!value) return null
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizePolicy(value: unknown): RoundingPolicy {
  return value === 'arredondar' ? 'arredondar' : 'truncar'
}

function normalizeContainer(value: unknown, fallback?: CalculatorContainer): CalculatorContainer | null {
  const source = asObject(value)
  const id = asString(source.id, fallback?.id).trim()
  if (!id) return null
  const taraKg = asFiniteNumber(source.taraKg, fallback?.taraKg ?? 0)
  return {
    id,
    nome: asString(source.nome, fallback?.nome ?? 'Recipiente').trim() || 'Recipiente',
    taraKg: taraKg >= 0 ? taraKg : fallback?.taraKg ?? 0,
    cor: asString(source.cor, fallback?.cor ?? '#526873') || '#526873',
    ativo: source.ativo !== false,
  }
}

function normalizeChange(value: unknown): CalculatorAuditChange | null {
  const source = asObject(value)
  const previous = asObject(source.anterior)
  const current = asObject(source.atual)
  const em = asString(source.em)
  if (!em) return null
  return {
    em,
    anterior: {
      produtoId: asString(previous.produtoId),
      endereco: asString(previous.endereco),
      quantidadeFinal: asFiniteNumber(previous.quantidadeFinal, 0),
    },
    atual: {
      produtoId: asString(current.produtoId),
      endereco: asString(current.endereco),
      quantidadeFinal: asFiniteNumber(current.quantidadeFinal, 0),
    },
  }
}

function normalizeHistoryRecord(value: unknown, index: number): CalculatorHistoryRecord | null {
  const source = asObject(value)
  const container = normalizeContainer(source.recipiente)
  if (!container) return null

  const identification = asObject(source.identificacao)
  const input = asObject(source.entrada)
  const calculation = asObject(source.calculo)
  const audit = asObject(source.auditoria)
  const finalQuantity = Math.max(0, Math.floor(asFiniteNumber(calculation.quantidadeFinal, 0)))
  const changes = Array.isArray(audit.alteracoes)
    ? audit.alteracoes.map(normalizeChange).filter((change): change is CalculatorAuditChange => Boolean(change)).slice(-REVISION_LIMIT)
    : []

  return {
    id: asString(source.id, `migrado-${index}-${Date.now()}`),
    criadoEm: asString(source.criadoEm, new Date().toISOString()),
    identificacao: {
      produtoId: asString(identification.produtoId, asString(source.produtoId)).trim().toLocaleUpperCase('pt-BR'),
      endereco: asString(identification.endereco, asString(source.endereco)).trim().toLocaleUpperCase('pt-BR'),
    },
    recipiente: container,
    entrada: {
      pesoBrutoKg: asFiniteNumber(input.pesoBrutoKg, 0),
      gramaturaG: asFiniteNumber(input.gramaturaG, 0),
    },
    calculo: {
      pesoLiquidoKg: Math.max(0, asFiniteNumber(calculation.pesoLiquidoKg, 0)),
      quantidadeEstimada: asFiniteNumber(calculation.quantidadeEstimada, finalQuantity),
      quantidadeComRendimento: asFiniteNumber(calculation.quantidadeComRendimento, finalQuantity),
      taxaRendimento: asFiniteNumber(calculation.taxaRendimento, DEFAULT_YIELD),
      politicaArredondamento: normalizePolicy(calculation.politicaArredondamento),
      quantidadeCalculadaOriginal: Math.max(0, Math.floor(asFiniteNumber(calculation.quantidadeCalculadaOriginal, finalQuantity))),
      quantidadeFinal: finalQuantity,
      versaoFormula: Math.max(1, Math.floor(asFiniteNumber(calculation.versaoFormula, CALCULATOR_FORMULA_VERSION))),
    },
    auditoria: {
      atualizadoEm: typeof audit.atualizadoEm === 'string'
        ? audit.atualizadoEm
        : typeof source.atualizadoEm === 'string' ? source.atualizadoEm : null,
      revisao: Math.max(0, Math.floor(asFiniteNumber(audit.revisao, 0))),
      alteracoes: changes,
    },
    versaoAplicativo: asString(source.versaoAplicativo, 'migrado'),
  }
}

function migrateLegacy(storage: StorageAdapter): CalculatorState {
  const state = createDefaultCalculatorState()
  const legacySettings = asObject(readJson(storage, LEGACY_SETTINGS_KEY))
  const legacyHistory = readJson(storage, LEGACY_HISTORY_KEY)

  if (legacySettings.theme === 'light' || legacySettings.theme === 'dark' || legacySettings.theme === 'system') {
    state.configuracoes.tema = legacySettings.theme
  }
  if (typeof legacySettings.defaultBombona === 'string') {
    state.configuracoes.recipientePadraoId = legacySettings.defaultBombona === 'branca'
      ? 'bombona-azul'
      : `bombona-${legacySettings.defaultBombona}`
  }

  if (Array.isArray(legacyHistory)) {
    state.historico = legacyHistory.map((value, index) => {
      const item = asObject(value)
      const legacyType = asString(item.tipoBombona, 'branca')
      const container = legacyType === 'branca'
        ? clone(DEFAULT_CONTAINERS[0])
        : clone(DEFAULT_CONTAINERS.find(candidate => candidate.id.includes(legacyType)) ?? DEFAULT_CONTAINERS[0])
      const grossWeight = asFiniteNumber(item.pesoBruto, 0)
      const finalQuantity = Math.max(0, Math.floor(asFiniteNumber(item.resultado, 0)))
      return {
        id: asString(item.id, `migrado-${index}-${Date.now()}`),
        criadoEm: new Date().toISOString(),
        identificacao: { produtoId: '', endereco: '' },
        recipiente: container,
        entrada: {
          pesoBrutoKg: grossWeight,
          gramaturaG: asFiniteNumber(item.gramatura, 0),
        },
        calculo: {
          pesoLiquidoKg: Math.max(0, grossWeight - container.taraKg),
          taxaRendimento: DEFAULT_YIELD,
          politicaArredondamento: DEFAULT_ROUNDING_POLICY,
          quantidadeCalculadaOriginal: finalQuantity,
          quantidadeFinal: finalQuantity,
          versaoFormula: CALCULATOR_FORMULA_VERSION,
        },
        auditoria: { atualizadoEm: null, revisao: 0, alteracoes: [] },
        versaoAplicativo: 'migrado',
      } satisfies CalculatorHistoryRecord
    })
  }
  return state
}

export function normalizeCalculatorState(value: unknown): CalculatorState {
  const defaults = createDefaultCalculatorState()
  const source = asObject(value)
  const sourceSettings = asObject(source.configuracoes)
  const sourceSchema = asFiniteNumber(source.schema, 0)
  const defaultById = new Map(DEFAULT_CONTAINERS.map(container => [container.id, container]))
  const rawContainers = Array.isArray(source.recipientes) && source.recipientes.length
    ? source.recipientes
    : defaults.recipientes
  const containers = rawContainers
    .map(value => {
      const object = asObject(value)
      const fallback = defaultById.get(asString(object.id))
      const normalized = normalizeContainer(value, fallback)
      if (normalized && sourceSchema < 4 && normalized.id === 'galao' && normalized.cor.toLowerCase() === '#d6a126') {
        normalized.cor = '#06b6d4'
      }
      return normalized
    })
    .filter((container): container is CalculatorContainer => Boolean(container))
  const usableContainers = containers.length ? containers : defaults.recipientes
  const activeContainers = usableContainers.filter(container => container.ativo)
  const requestedDefault = asString(sourceSettings.recipientePadraoId)
  const defaultContainerId = activeContainers.some(container => container.id === requestedDefault)
    ? requestedDefault
    : activeContainers[0]?.id ?? usableContainers[0].id
  const theme = sourceSettings.tema === 'light' || sourceSettings.tema === 'dark'
    ? sourceSettings.tema
    : 'system'
  const yieldRate = asFiniteNumber(sourceSettings.taxaRendimento, DEFAULT_YIELD)

  return {
    schema: SCHEMA_VERSION,
    versaoAplicativo: CALCULATOR_APP_VERSION,
    configuracoes: {
      tema: theme,
      recipientePadraoId: defaultContainerId,
      taxaRendimento: yieldRate > 0 && yieldRate <= 1 ? yieldRate : DEFAULT_YIELD,
      politicaArredondamento: normalizePolicy(sourceSettings.politicaArredondamento),
    },
    recipientes: usableContainers,
    historico: Array.isArray(source.historico)
      ? source.historico
          .map(normalizeHistoryRecord)
          .filter((record): record is CalculatorHistoryRecord => Boolean(record))
          .slice(0, HISTORY_LIMIT)
      : [],
  }
}

export function saveCalculatorState(state: CalculatorState, storage = defaultStorage()): CalculatorState {
  const normalized = normalizeCalculatorState(state)
  try {
    storage.setItem(CALCULATOR_STORAGE_KEY, JSON.stringify(normalized))
  } catch (error) {
    throw new CalculatorStorageError('Não foi possível salvar os dados da calculadora neste dispositivo.', { cause: error })
  }
  return normalized
}

export function loadCalculatorState(storage = defaultStorage()): CalculatorState {
  const stored = readJson(storage, CALCULATOR_STORAGE_KEY)
  const normalized = normalizeCalculatorState(stored ?? migrateLegacy(storage))
  return saveCalculatorState(normalized, storage)
}

export function updateCalculatorState(
  mutation: (draft: CalculatorState) => CalculatorState | void,
  storage = defaultStorage(),
): CalculatorState {
  const current = loadCalculatorState(storage)
  const draft = clone(current)
  return saveCalculatorState(mutation(draft) ?? draft, storage)
}

export function addCalculatorHistory(record: CalculatorHistoryRecord, storage = defaultStorage()): CalculatorState {
  return updateCalculatorState(state => {
    state.historico.unshift(record)
    state.historico = state.historico.slice(0, HISTORY_LIMIT)
  }, storage)
}

export function replaceCalculatorHistoryRecord(
  id: string,
  mutation: (record: CalculatorHistoryRecord) => CalculatorHistoryRecord | void,
  storage = defaultStorage(),
): { state: CalculatorState; record: CalculatorHistoryRecord | null } {
  let updated: CalculatorHistoryRecord | null = null
  const state = updateCalculatorState(draft => {
    const index = draft.historico.findIndex(record => record.id === id)
    if (index < 0) return
    const record = clone(draft.historico[index])
    updated = mutation(record) ?? record
    draft.historico[index] = updated
  }, storage)
  return { state, record: updated }
}

export function removeCalculatorHistoryRecord(
  id: string,
  storage = defaultStorage(),
): { state: CalculatorState; record: CalculatorHistoryRecord | null } {
  let removed: CalculatorHistoryRecord | null = null
  const state = updateCalculatorState(draft => {
    const index = draft.historico.findIndex(record => record.id === id)
    if (index >= 0) [removed] = draft.historico.splice(index, 1)
  }, storage)
  return { state, record: removed }
}

export function restoreCalculatorHistoryRecord(record: CalculatorHistoryRecord, storage = defaultStorage()): CalculatorState {
  return updateCalculatorState(state => {
    state.historico = [record, ...state.historico.filter(item => item.id !== record.id)].slice(0, HISTORY_LIMIT)
  }, storage)
}

export function clearCalculatorHistory(storage = defaultStorage()): CalculatorState {
  return updateCalculatorState(state => { state.historico = [] }, storage)
}

export function saveCalculatorPreferences(
  preferences: Partial<CalculatorSettings>,
  storage = defaultStorage(),
): CalculatorState {
  return updateCalculatorState(state => {
    state.configuracoes = { ...state.configuracoes, ...preferences }
  }, storage)
}

export function saveCalculatorAdministration(
  containers: CalculatorContainer[],
  settings: Pick<CalculatorSettings, 'taxaRendimento' | 'politicaArredondamento'>,
  storage = defaultStorage(),
): CalculatorState {
  return updateCalculatorState(state => {
    state.recipientes = containers
    state.configuracoes = { ...state.configuracoes, ...settings }
  }, storage)
}

export function restoreCalculatorDefaults(storage = defaultStorage()): CalculatorState {
  return updateCalculatorState(state => {
    state.recipientes = DEFAULT_CONTAINERS.map(container => ({ ...container }))
    state.configuracoes.recipientePadraoId = 'bombona-azul'
    state.configuracoes.taxaRendimento = DEFAULT_YIELD
    state.configuracoes.politicaArredondamento = DEFAULT_ROUNDING_POLICY
  }, storage)
}
