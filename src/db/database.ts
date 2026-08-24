import Dexie, { type Table } from 'dexie'
import type { InventoryLocation } from '../types/inventory'
import seed from '../data/seedInventory.json'
import { normalizeSearch } from '../utils/normalize'

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
  if (seeded) return
  const count = await db.locations.count()
  if (count === 0) {
    const records = (seed as unknown as InventoryLocation[]).map(r => ({ ...r, codigoNormalizado: normalizeSearch(r.codigo) }))
    await db.locations.bulkAdd(records)
  }
  await db.meta.put({ key: 'seeded-v1', value: true })
}
