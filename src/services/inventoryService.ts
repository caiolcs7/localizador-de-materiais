import type { RealtimeChannel } from '@supabase/supabase-js'
import { db, ensureLocalFallbackSeeded, replaceInventoryCache } from '../db/database'
import { requireSupabase, supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import type { InventoryLocation, ItemDraft, SearchResult } from '../types/inventory'
import { equivalentAI, formatBombona, inferRua, normalizeSearch } from '../utils/normalize'

type InventoryRow = Database['public']['Tables']['inventory_locations']['Row']

const fromRow = (row: InventoryRow): InventoryLocation => ({
  id: row.id,
  codigo: row.codigo,
  codigoOriginal: row.codigo_original,
  codigoNormalizado: row.codigo_normalizado,
  aliases: row.aliases,
  bombona: row.bombona,
  endereco: row.endereco,
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

async function fetchAllInventory() {
  const client = requireSupabase()
  const pageSize = 1000
  const records: InventoryLocation[] = []
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await client
      .from('inventory_locations')
      .select('*')
      .order('id', { ascending: true })
      .range(start, start + pageSize - 1)
    if (error) throw new Error('Não foi possível sincronizar os materiais.', { cause: error })
    records.push(...data.map(fromRow))
    if (data.length < pageSize) break
  }
  return records
}

export async function syncInventory() {
  const records = await fetchAllInventory()
  await replaceInventoryCache(records)
  return records
}

export async function initializeInventory() {
  try {
    await syncInventory()
    return { online: true }
  } catch (error) {
    if (await db.locations.count() === 0) await ensureLocalFallbackSeeded()
    console.warn('Usando a última cópia local dos materiais.', error)
    return { online: false }
  }
}

export async function searchInventory(raw: string): Promise<SearchResult> {
  const query = normalizeSearch(raw)
  const bombonaQuery = normalizeSearch(formatBombona(raw))
  if (!query) return { kind: 'contains', items: [] }
  const all = await db.locations.toArray()
  const exact = all.filter(item => item.codigoNormalizado === query || (item.aliases ?? []).some(alias => normalizeSearch(alias) === query))
  if (exact.length) return { kind: 'exact', items: exact }
  const equivalent = all.filter(item => equivalentAI(item.codigo, query))
  if (equivalent.length) return { kind: 'equivalent', items: equivalent }
  const bombona = all.filter(item => normalizeSearch(formatBombona(item.bombona)) === bombonaQuery)
  if (bombona.length) return { kind: 'bombona', items: bombona }
  const endereco = all.filter(item => normalizeSearch(item.endereco) === query)
  if (endereco.length) return { kind: 'endereco', items: endereco }
  const prefix = all.filter(item => item.codigoNormalizado.startsWith(query))
  if (prefix.length) return { kind: 'prefix', items: prefix.slice(0, 80) }
  const contains = all.filter(item => item.codigoNormalizado.includes(query))
  if (contains.length) return { kind: 'contains', items: contains.slice(0, 80) }
  if (query.length >= 5) {
    const codes = [...new Set(all.map(item => item.codigoNormalizado))]
    const scored = codes.map(code => ({ code, distance: levenshtein(query, code) })).sort((a, b) => a.distance - b.distance)
    if (scored[0] && scored[0].distance <= Math.max(1, Math.floor(query.length * 0.12))) {
      return { kind: 'suggestion', items: [], suggestion: scored[0].code }
    }
  }
  return { kind: 'contains', items: [] }
}

export async function saveLocation(draft: ItemDraft, allowDuplicate = false) {
  const client = requireSupabase()
  const codigo = draft.codigo.trim().toUpperCase()
  const bombona = formatBombona(draft.bombona)
  const endereco = draft.endereco.trim().toUpperCase()
  const codigoNormalizado = normalizeSearch(codigo)
  if (!codigo || !bombona || !endereco) throw new Error('Código, bombona e endereço são obrigatórios.')

  const all = await db.locations.toArray()
  const duplicate = all.find(item => item.id !== draft.id && item.codigoNormalizado === codigoNormalizado && normalizeSearch(formatBombona(item.bombona)) === normalizeSearch(bombona) && normalizeSearch(item.endereco) === normalizeSearch(endereco))
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
    const { data, error } = await request.select('*').maybeSingle()
    if (error) {
      if (error.code === '23505' && !allowDuplicate) return { duplicate }
      throw new Error('Não foi possível atualizar o material.', { cause: error })
    }
    if (!data) throw new Error('Este registro foi alterado por outra pessoa. Atualize a lista e tente novamente.')
    const record = fromRow(data)
    await db.locations.put(record)
    return { record }
  }

  const { data, error } = await client.from('inventory_locations').insert({ id: crypto.randomUUID(), ...payload }).select('*').single()
  if (error) {
    if (error.code === '23505' && !allowDuplicate) return { duplicate }
    throw new Error('Não foi possível cadastrar o material.', { cause: error })
  }
  const record = fromRow(data)
  await db.locations.put(record)
  return { record }
}

export async function deleteLocation(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('inventory_locations').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir o material.', { cause: error })
  await db.locations.delete(id)
}

export const getAllLocations = () => db.locations.toArray()

export function subscribeToInventory(onChange: () => void | Promise<void>) {
  if (!supabase) return () => undefined
  const client = supabase
  let timer: ReturnType<typeof setTimeout> | null = null
  const channel: RealtimeChannel = client
    .channel('inventory-live-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_locations' }, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void syncInventory().then(onChange) }, 120)
    })
    .subscribe()
  return () => {
    if (timer) clearTimeout(timer)
    void client.removeChannel(channel)
  }
}
