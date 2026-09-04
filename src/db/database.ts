import Dexie, { type Table } from 'dexie'
import type { InventoryLocation } from '../types/inventory'
import { formatBombona, normalizeSearch } from '../utils/normalize'

class InventoryDB extends Dexie {
  locations!: Table<InventoryLocation, string>
  meta!: Table<{ key: string; value: unknown }, string>
  constructor() {
    super('LocalizadorMateriaisDB')
    this.version(1).stores({
      locations: 'id,codigoNormalizado,bombona,endereco,rua,atualizadoEm',
      meta: 'key'
    })
  }
}

export const db = new InventoryDB()

const codeSet = (record: InventoryLocation) =>
  new Set([record.codigo, ...(record.aliases ?? [])].map(normalizeSearch))

export async function ensureLocalFallbackSeeded() {
  const [{ default: seed }, { default: moniqueAdditions }] = await Promise.all([
    import('../data/seedInventory.json'),
    import('../data/moniqueAdditions.json'),
  ])
  const seeded = await db.meta.get('seeded-v1')
  if (!seeded) {
    const count = await db.locations.count()
    if (count === 0) {
      const records = (seed as unknown as InventoryLocation[]).map(r => ({
        ...r,
        codigoNormalizado: normalizeSearch(r.codigo),
        bombona: formatBombona(r.bombona)
      }))
      await db.locations.bulkAdd(records)
    }
    await db.meta.put({ key: 'seeded-v1', value: true })
  }

  const bombonaMigration = await db.meta.get('bombona-3digits-v1')
  if (!bombonaMigration) {
    const all = await db.locations.toArray()
    const changed = all
      .map(record => ({ ...record, bombona: formatBombona(record.bombona) }))
      .filter((record, index) => record.bombona !== all[index].bombona)

    if (changed.length) await db.locations.bulkPut(changed)
    await db.meta.put({ key: 'bombona-3digits-v1', value: true })
  }

  const moniqueMigration = await db.meta.get('monique-luminarias-v1')
  if (!moniqueMigration) {
    const existing = await db.locations.toArray()
    const additions = (moniqueAdditions as unknown as InventoryLocation[]).map(record => ({
      ...record,
      codigoNormalizado: normalizeSearch(record.codigo),
      bombona: formatBombona(record.bombona)
    }))

    const missing = additions.filter(candidate => {
      const candidateCodes = codeSet(candidate)
      return !existing.some(record => {
        if (formatBombona(record.bombona) !== candidate.bombona) return false
        return [...codeSet(record)].some(code => candidateCodes.has(code))
      })
    })

    if (missing.length) await db.locations.bulkAdd(missing)
    await db.meta.put({ key: 'monique-luminarias-v1', value: { expected: additions.length, added: missing.length } })
  }
}

export async function replaceInventoryCache(records: InventoryLocation[]) {
  await db.transaction('rw', db.locations, db.meta, async () => {
    await db.locations.clear()
    await db.locations.bulkPut(records)
    await db.meta.put({ key: 'supabase-last-sync', value: new Date().toISOString() })
  })
}
