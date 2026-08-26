import type { InventoryLocation } from '../types/inventory'
import moniqueAdditions from '../data/moniqueAdditions.json'
import { canonicalAI, formatBombona, normalizeSearch } from '../utils/normalize'
import { db } from './database'

function sameCode(existing: InventoryLocation, candidate: InventoryLocation) {
  const target = normalizeSearch(candidate.codigo)
  const codes = [existing.codigo, ...(existing.aliases ?? [])]

  return codes.some(value => {
    const normalized = normalizeSearch(value)
    if (normalized === target) return true
    return /AI[46]$/.test(normalized) && /AI[46]$/.test(target) && canonicalAI(normalized) === canonicalAI(target)
  })
}

export async function applyMoniqueLuminarias() {
  const applied = await db.meta.get('monique-luminarias-v1')
  if (applied) return

  const existing = await db.locations.toArray()
  const additions = (moniqueAdditions as unknown as InventoryLocation[]).map(record => ({
    ...record,
    codigoNormalizado: normalizeSearch(record.codigo),
    bombona: formatBombona(record.bombona)
  }))

  const missing = additions.filter(candidate => {
    const bombona = formatBombona(candidate.bombona)
    return !existing.some(record => formatBombona(record.bombona) === bombona && sameCode(record, candidate))
  })

  if (missing.length) await db.locations.bulkAdd(missing)
  await db.meta.put({ key: 'monique-luminarias-v1', value: { expected: additions.length, added: missing.length } })
}
