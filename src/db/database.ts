import Dexie, { type Table } from 'dexie'
import type { InventoryLocation } from '../types/inventory'
import seed from '../data/seedInventory.json'
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

export async function ensureSeeded() {
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
}
