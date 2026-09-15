import type { RealtimeChannel } from '@supabase/supabase-js'
import { db, ensureLocalFallbackSeeded, replaceInventoryCache } from '../db/database'
import { requireSupabase, supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { InventoryLocation, ItemDraft, SearchKind, SearchResult } from '../types/inventory'
import { equivalentAI, formatBombona, inferRua, normalizeSearch } from '../utils/normalize'
import { getMaterialDescription } from '../features/materials/materialCatalog'
import { matchesMaterialSearch } from '../features/materials/materialCode'
import { isVisibleWithStockFilter } from '../features/inventory/stockVisibility'

type InventoryRow = Database['public']['Tables']['inventory_locations']['Row']

export type InventoryRealtimeChange =
  | { eventType: 'INSERT' | 'UPDATE'; record: InventoryLocation }
  | { eventType: 'DELETE'; id: string }

export type InventorySearchOptions = {
  offset?: number
  limit?: number
  onlyAvailable?: boolean
  signal?: AbortSignal
  bypassCache?: boolean
  offlineFallback?: boolean
}

const INVENTORY_COLUMNS = 'id,codigo,codigo_original,codigo_normalizado,aliases,bombona,endereco,endereco_original,rua,descritivo,quantidade,observacoes,grupo,arquivo_origem,registro_tipo,duplicate_override,version,created_at,updated_at'
const DEFAULT_SEARCH_LIMIT = 120
const SEARCH_CACHE_TTL_MS = 30_000
const SEARCH_CACHE_MAX_ENTRIES = 40
const searchCache = new Map<string, { expiresAt: number; result: SearchResult }>()

const fromRow = (row: InventoryRow): InventoryLocation => ({
  id: row.id,
  codigo: row.codigo,
  codigoOriginal: row.codigo_original,
  codigoNormalizado: row.codigo_normalizado,
  aliases: row.aliases,
  bombona: row.bombona,
  endereco: row.endereco ?? '',
  enderecoOriginal: row.endereco_original,
  rua: row.rua,
  descritivo: row.descritivo,
  quantidade: row.quantidade,
  observacoes: row.observacoes,
  grupo: row.grupo,
  arquivoOrigem: row.arquivo_origem,
  registroTipo: row.registro_tipo,
  duplicateOverride: row.duplicate_override,
  version: row.version,
  criadoEm: row.created_at,
  atualizadoEm: row.updated_at,
})

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    let previous = matrix[0]
    matrix[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = matrix[j]
      matrix[j] = Math.min(matrix[j] + 1, matrix[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return matrix[b.length]
}

function addressPriority(item: InventoryLocation) {
  const address = item.endereco.trim().toUpperCase()
  if (item.bombona.trim().toUpperCase().startsWith('R')) return 0
  if (address.startsWith('R')) return 1
  if (address.startsWith('EXT')) return 2
  return 3
}

function sortSearchResults(items: InventoryLocation[]) {
  return [...items].sort((a, b) => addressPriority(a) - addressPriority(b)
    || a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })
    || a.endereco.localeCompare(b.endereco, 'pt-BR', { numeric: true })
    || a.bombona.localeCompare(b.bombona, 'pt-BR', { numeric: true }))
}

function classifySearch(raw: string, items: InventoryLocation[]): SearchKind {
  const query = normalizeSearch(raw)
  const bombonaQuery = normalizeSearch(formatBombona(raw))
  if (items.some(item => item.codigoNormalizado === query || (item.aliases ?? []).some(alias => normalizeSearch(alias) === query))) return 'exact'
  if (items.some(item => equivalentAI(item.codigo, query))) return 'equivalent'
  if (items.some(item => normalizeSearch(formatBombona(item.bombona)) === bombonaQuery)) return 'bombona'
  if (items.some(item => normalizeSearch(item.endereco) === query)) return 'endereco'
  if (items.some(item => item.codigoNormalizado.startsWith(query))) return 'prefix'
  return 'contains'
}

function getCachedSearch(key: string) {
  const cached = searchCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key)
    return null
  }
  searchCache.delete(key)
  searchCache.set(key, cached)
  return cached.result
}

function cacheSearch(key: string, result: SearchResult) {
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, result })
  while (searchCache.size > SEARCH_CACHE_MAX_ENTRIES) {
    const oldest = searchCache.keys().next().value
    if (oldest === undefined) break
    searchCache.delete(oldest)
  }
}

export function invalidateInventorySearchCache() {
  searchCache.clear()
}

export async function fetchAllInventory() {
  const client = requireSupabase()
  const pageSize = 1000
  const records: InventoryLocation[] = []
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await client
      .from('inventory_locations')
      .select(INVENTORY_COLUMNS)
      .order('id', { ascending: true })
      .range(start, start + pageSize - 1)
    if (error) throw new Error('Não foi possível carregar todos os materiais.', { cause: error })
    records.push(...(data as InventoryRow[]).map(fromRow))
    if (data.length < pageSize) break
  }
  return records
}

export async function syncInventory() {
  const records = await fetchAllInventory()
  await replaceInventoryCache(records)
  invalidateInventorySearchCache()
  return records
}

export async function initializeInventory() {
  try {
    const client = requireSupabase()
    const { count, error } = await client
      .from('inventory_locations')
      .select('id', { count: 'exact', head: true })
    if (error) throw error
    return { online: true, total: count ?? 0 }
  } catch (error) {
    if (await db.locations.count() === 0) await ensureLocalFallbackSeeded()
    console.warn('Usando a última cópia local dos materiais.', error)
    return { online: false, total: await db.locations.count() }
  }
}

async function searchLocalInventory(raw: string, onlyAvailable: boolean): Promise<SearchResult> {
  const query = normalizeSearch(raw)
  const bombonaQuery = normalizeSearch(formatBombona(raw))
  const allRecords = await db.locations.toArray()
  const all = onlyAvailable
    ? allRecords.filter(item => isVisibleWithStockFilter(item, getMaterialDescription(item.codigo, item.descritivo)))
    : allRecords
  const exact = all.filter(item => item.codigoNormalizado === query || (item.aliases ?? []).some(alias => normalizeSearch(alias) === query))
  if (exact.length) return { kind: 'exact', items: sortSearchResults(exact), hasMore: false }
  const equivalent = all.filter(item => equivalentAI(item.codigo, query))
  if (equivalent.length) return { kind: 'equivalent', items: sortSearchResults(equivalent), hasMore: false }
  const bombona = all.filter(item => normalizeSearch(formatBombona(item.bombona)) === bombonaQuery)
  if (bombona.length) return { kind: 'bombona', items: sortSearchResults(bombona), hasMore: false }
  const endereco = all.filter(item => normalizeSearch(item.endereco) === query)
  if (endereco.length) return { kind: 'endereco', items: sortSearchResults(endereco), hasMore: false }
  const prefix = all.filter(item => item.codigoNormalizado.startsWith(query))
  const contains = all.filter(item => item.codigoNormalizado.includes(query))
  const descriptive = all.filter(item => matchesMaterialSearch(item.codigo, getMaterialDescription(item.codigo, item.descritivo), raw))
  const seen = new Set<string>()
  const combined = [...prefix, ...contains, ...descriptive].filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  if (combined.length) return { kind: prefix.length ? 'prefix' : 'contains', items: sortSearchResults(combined), hasMore: false }

  if (query.length >= 5) {
    const codes = [...new Set(all.map(item => item.codigoNormalizado))]
    const scored = codes.map(code => ({ code, distance: levenshtein(query, code) })).sort((a, b) => a.distance - b.distance)
    if (scored[0] && scored[0].distance <= Math.max(1, Math.floor(query.length * 0.12))) {
      return { kind: 'suggestion', items: [], suggestion: scored[0].code, hasMore: false }
    }
  }
  return { kind: 'contains', items: [], hasMore: false }
}

export async function searchInventory(raw: string, options: InventorySearchOptions = {}): Promise<SearchResult> {
  const query = normalizeSearch(raw)
  if (!query) return { kind: 'contains', items: [], hasMore: false }
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_SEARCH_LIMIT, 1), 250)
  const offset = Math.max(options.offset ?? 0, 0)
  const onlyAvailable = options.onlyAvailable === true
  const cacheKey = `${query}|${formatBombona(raw)}|${onlyAvailable ? 1 : 0}|${offset}|${limit}`
  if (!options.bypassCache) {
    const cached = getCachedSearch(cacheKey)
    if (cached) return cached
  }

  if (!supabase) {
    if (options.offlineFallback === false) throw new Error('A conexão com o banco de dados não está configurada.')
    return searchLocalInventory(raw, onlyAvailable)
  }

  try {
    let request = supabase.rpc('search_inventory_locations', {
      p_query: raw.trim().slice(0, 120),
      p_normalized: query.slice(0, 120),
      p_bombona: formatBombona(raw).slice(0, 80),
      p_limit: limit + 1,
      p_offset: offset,
      p_only_available: onlyAvailable,
    })
    if (options.signal) request = request.abortSignal(options.signal)
    const { data, error } = await request
    if (error) throw error
    const rows = (data as InventoryRow[]).map(fromRow)
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    await db.locations.bulkPut(items)
    const result: SearchResult = { kind: classifySearch(raw, items), items, hasMore }
    cacheSearch(cacheKey, result)
    return result
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (options.offlineFallback === false) throw error
    console.warn('A pesquisa online falhou; usando o cache local.', error)
    return searchLocalInventory(raw, onlyAvailable)
  }
}

export async function findInventoryProductByCode(rawCode: string, signal?: AbortSignal) {
  const query = normalizeSearch(rawCode)
  if (!query) return null
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = globalThis.setTimeout(() => controller.abort(new DOMException('Tempo limite excedido.', 'TimeoutError')), 8000)
  try {
    const result = await searchInventory(query, {
      limit: 50,
      onlyAvailable: false,
      signal: controller.signal,
      bypassCache: true,
      offlineFallback: false,
    })
    if (result.kind !== 'exact') return null
    const exact = result.items.filter(item => item.codigoNormalizado === query
      || (item.aliases ?? []).some(alias => normalizeSearch(alias) === query))
    return exact.find(item => item.descritivo?.trim()) ?? exact[0] ?? null
  } finally {
    globalThis.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

export async function fetchInventoryForCodes(rawCodes: string[]) {
  const client = requireSupabase()
  const codes = new Set<string>()
  for (const rawCode of rawCodes) {
    const code = normalizeSearch(rawCode)
    if (!code) continue
    codes.add(code)
    if (code.endsWith('AI4')) codes.add(`${code.slice(0, -1)}6`)
    if (code.endsWith('AI6')) codes.add(`${code.slice(0, -1)}4`)
  }
  const normalizedCodes = [...codes]
  const records: InventoryLocation[] = []
  for (let start = 0; start < normalizedCodes.length; start += 150) {
    const { data, error } = await client
      .from('inventory_locations')
      .select(INVENTORY_COLUMNS)
      .in('codigo_normalizado', normalizedCodes.slice(start, start + 150))
    if (error) throw new Error('Não foi possível sincronizar as localizações dos carrinhos.', { cause: error })
    records.push(...(data as InventoryRow[]).map(fromRow))
  }
  await db.locations.bulkPut(records)
  return sortSearchResults(records)
}

export async function saveLocation(draft: ItemDraft, allowDuplicate = false) {
  const client = requireSupabase()
  const codigo = draft.codigo.trim().toUpperCase()
  const bombona = formatBombona(draft.bombona)
  const endereco = draft.endereco.trim().toUpperCase()
  const codigoNormalizado = normalizeSearch(codigo)
  if (!codigo || !bombona || !endereco) throw new Error('Código, bombona e endereço são obrigatórios.')

  let duplicateRequest = client
    .from('inventory_locations')
    .select(INVENTORY_COLUMNS)
    .eq('codigo_normalizado', codigoNormalizado)
    .eq('bombona', bombona)
    .eq('endereco', endereco)
    .limit(1)
  if (draft.id) duplicateRequest = duplicateRequest.neq('id', draft.id)
  const { data: duplicateRows, error: duplicateError } = await duplicateRequest
  if (duplicateError) throw new Error('Não foi possível validar a localização.', { cause: duplicateError })
  const duplicate = duplicateRows[0] ? fromRow(duplicateRows[0] as InventoryRow) : undefined
  if (duplicate && !allowDuplicate) return { duplicate }

  const payload = {
    codigo,
    codigo_original: draft.codigoOriginal ?? null,
    codigo_normalizado: codigoNormalizado,
    aliases: draft.aliases ?? [],
    bombona,
    endereco,
    endereco_original: draft.enderecoOriginal ?? null,
    rua: inferRua(bombona),
    descritivo: draft.descritivo ?? null,
    quantidade: draft.quantidade ?? null,
    observacoes: draft.observacoes ?? null,
    grupo: draft.grupo ?? null,
    arquivo_origem: draft.arquivoOrigem ?? null,
    registro_tipo: draft.registroTipo ?? 'material',
    duplicate_override: allowDuplicate || draft.duplicateOverride === true,
  }

  if (draft.id) {
    let request = client.from('inventory_locations').update(payload).eq('id', draft.id)
    if (draft.version != null) request = request.eq('version', draft.version)
    const { data, error } = await request.select(INVENTORY_COLUMNS).maybeSingle()
    if (error) {
      if (error.code === '23505' && !allowDuplicate) return { duplicate }
      throw new Error('Não foi possível atualizar o material.', { cause: error })
    }
    if (!data) throw new Error('Este registro foi alterado por outra pessoa. Atualize a lista e tente novamente.')
    const record = fromRow(data as InventoryRow)
    await db.locations.put(record)
    invalidateInventorySearchCache()
    return { record }
  }

  const { data, error } = await client.from('inventory_locations').insert({ id: crypto.randomUUID(), ...payload }).select(INVENTORY_COLUMNS).single()
  if (error) {
    if (error.code === '23505' && !allowDuplicate) return { duplicate }
    throw new Error('Não foi possível cadastrar o material.', { cause: error })
  }
  const record = fromRow(data as InventoryRow)
  await db.locations.put(record)
  invalidateInventorySearchCache()
  return { record }
}

export async function deleteLocation(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('inventory_locations').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir o material.', { cause: error })
  await db.locations.delete(id)
  invalidateInventorySearchCache()
}

export const getAllLocations = () => db.locations.toArray()

export function subscribeToInventory(onChange: (change: InventoryRealtimeChange) => void | Promise<void>) {
  if (!supabase) return () => undefined
  const client = supabase
  const channel: RealtimeChannel = client
    .channel('inventory-live-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_locations' }, payload => {
      invalidateInventorySearchCache()
      if (payload.eventType === 'DELETE') {
        const id = String((payload.old as { id?: unknown }).id ?? '')
        if (!id) return
        void db.locations.delete(id)
        void onChange({ eventType: 'DELETE', id })
        return
      }
      const record = fromRow(payload.new as InventoryRow)
      void db.locations.put(record)
      void onChange({ eventType: payload.eventType, record })
    })
    .subscribe()
  return () => { void client.removeChannel(channel) }
}
