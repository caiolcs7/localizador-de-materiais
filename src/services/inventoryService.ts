import { db } from '../db/database'
import type { InventoryLocation, ItemDraft, SearchResult } from '../types/inventory'
import { equivalentAI, formatBombona, inferRua, normalizeSearch } from '../utils/normalize'

const levenshtein = (a: string, b: string) => {
  const m = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = m[0]; m[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = m[j]
      m[j] = Math.min(m[j] + 1, m[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return m[b.length]
}

export async function searchInventory(raw: string): Promise<SearchResult> {
  const q = normalizeSearch(raw)
  const bombonaQ = normalizeSearch(formatBombona(raw))
  if (!q) return { kind: 'contains', items: [] }
  const all = await db.locations.toArray()
  const exact = all.filter(x => x.codigoNormalizado === q || (x.aliases ?? []).some(a => normalizeSearch(a) === q))
  if (exact.length) return { kind: 'exact', items: exact }
  const equivalent = all.filter(x => equivalentAI(x.codigo, q))
  if (equivalent.length) return { kind: 'equivalent', items: equivalent }
  const bombona = all.filter(x => normalizeSearch(formatBombona(x.bombona)) === bombonaQ)
  if (bombona.length) return { kind: 'bombona', items: bombona }
  const endereco = all.filter(x => normalizeSearch(x.endereco) === q)
  if (endereco.length) return { kind: 'endereco', items: endereco }
  const prefix = all.filter(x => x.codigoNormalizado.startsWith(q))
  if (prefix.length) return { kind: 'prefix', items: prefix.slice(0, 80) }
  const contains = all.filter(x => x.codigoNormalizado.includes(q))
  if (contains.length) return { kind: 'contains', items: contains.slice(0, 80) }
  if (q.length >= 5) {
    const codes = [...new Set(all.map(x => x.codigoNormalizado))]
    const scored = codes.map(c => ({ c, d: levenshtein(q, c) })).sort((a,b) => a.d - b.d)
    if (scored[0] && scored[0].d <= Math.max(1, Math.floor(q.length * 0.12))) return { kind: 'suggestion', items: [], suggestion: scored[0].c }
  }
  return { kind: 'contains', items: [] }
}

export async function saveLocation(draft: ItemDraft, allowDuplicate = false) {
  const codigo = draft.codigo.trim().toUpperCase()
  const bombona = formatBombona(draft.bombona)
  const endereco = draft.endereco.trim().toUpperCase()
  const normalized = normalizeSearch(codigo)
  if (!codigo || !bombona || !endereco) throw new Error('Código, bombona e endereço são obrigatórios.')
  const all = await db.locations.toArray()
  const duplicate = all.find(x => x.id !== draft.id && x.codigoNormalizado === normalized && normalizeSearch(formatBombona(x.bombona)) === normalizeSearch(bombona) && normalizeSearch(x.endereco) === normalizeSearch(endereco))
  if (duplicate && !allowDuplicate) return { duplicate }
  const now = new Date().toISOString()
  const existing = draft.id ? await db.locations.get(draft.id) : undefined
  const record: InventoryLocation = {
    ...draft,
    id: draft.id ?? crypto.randomUUID(),
    codigo,
    codigoNormalizado: normalized,
    bombona,
    endereco,
    rua: inferRua(bombona),
    criadoEm: existing?.criadoEm ?? now,
    atualizadoEm: now
  } as InventoryLocation
  await db.locations.put(record)
  return { record }
}

export const deleteLocation = (id: string) => db.locations.delete(id)
export const getAllLocations = () => db.locations.toArray()
