import type { LuminaireCart } from '../../types/cart'
import type { InventoryLocation } from '../../types/inventory'
import { normalizeSearch } from '../../utils/normalize'
import { collectKnownCartCodes, findCartMemberships } from '../carts/cartLookup'
import { findInventoryLocations } from '../carts/cartUtils'

export type ItemsStatusFilter = 'all' | 'located' | 'unlocated' | 'empty'
export type ItemRowStatus = Exclude<ItemsStatusFilter, 'all'>

export type ItemStatusRow = {
  key: string
  status: ItemRowStatus
  codigo: string
  bombona: string
  endereco: string
  descritivo: string | null
  quantidade: number | null
  inventoryItem: InventoryLocation | null
  carts: string[]
}

const emptyCodeTokens = new Set([
  'VAZIO',
  'VAZIA',
  'SEM CODIGO',
  'SEM IDENTIFICACAO',
  'SEM ID',
])

export function isEmptyCodeRecord(item: Pick<InventoryLocation, 'codigo' | 'registroTipo' | 'grupo'>) {
  if (normalizeSearch(item.registroTipo ?? '') === 'SEM_CODIGO') return true
  if (normalizeSearch(item.grupo ?? '') === 'SEM_CODIGO') return true
  return emptyCodeTokens.has(normalizeSearch(item.codigo))
}

export function hasPhysicalLocation(item: Pick<InventoryLocation, 'bombona' | 'endereco'>) {
  return Boolean(item.bombona?.trim() && item.endereco?.trim())
}

function mergeCartNames(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function buildItemStatusRows(inventory: InventoryLocation[], carts: LuminaireCart[]): ItemStatusRow[] {
  const rows: ItemStatusRow[] = []
  const locatedInventory = inventory.filter(item => !isEmptyCodeRecord(item) && hasPhysicalLocation(item))
  const unlocatedByCode = new Map<string, ItemStatusRow>()

  for (const item of inventory) {
    const emptyCode = isEmptyCodeRecord(item)
    const located = hasPhysicalLocation(item)
    const cartNames = findCartMemberships(item.codigo, carts).map(match => match.cartName)

    if (emptyCode) {
      if (!located) continue
      rows.push({
        key: `empty:${item.id}`,
        status: 'empty',
        codigo: item.codigo,
        bombona: item.bombona,
        endereco: item.endereco,
        descritivo: item.descritivo ?? null,
        quantidade: item.quantidade ?? null,
        inventoryItem: item,
        carts: [],
      })
      continue
    }

    const row: ItemStatusRow = {
      key: `inventory:${item.id}`,
      status: located ? 'located' : 'unlocated',
      codigo: item.codigo,
      bombona: item.bombona ?? '',
      endereco: item.endereco ?? '',
      descritivo: item.descritivo ?? null,
      quantidade: item.quantidade ?? null,
      inventoryItem: item,
      carts: cartNames,
    }
    rows.push(row)
    if (!located) unlocatedByCode.set(normalizeSearch(item.codigo), row)
  }

  for (const cartCode of collectKnownCartCodes(carts)) {
    if (findInventoryLocations(cartCode.codigo, locatedInventory).length) continue
    const key = normalizeSearch(cartCode.codigo)
    const existing = unlocatedByCode.get(key)
    if (existing) {
      existing.carts = mergeCartNames(existing.carts, cartCode.carts)
      if (!existing.descritivo) existing.descritivo = cartCode.descritivo
      continue
    }

    const row: ItemStatusRow = {
      key: `cart-missing:${key}`,
      status: 'unlocated',
      codigo: cartCode.codigo,
      bombona: '',
      endereco: '',
      descritivo: cartCode.descritivo,
      quantidade: null,
      inventoryItem: null,
      carts: cartCode.carts,
    }
    rows.push(row)
    unlocatedByCode.set(key, row)
  }

  return rows.sort((a, b) => {
    const statusOrder: Record<ItemRowStatus, number> = { located: 0, unlocated: 1, empty: 2 }
    return statusOrder[a.status] - statusOrder[b.status]
      || a.codigo.localeCompare(b.codigo, 'pt-BR')
      || a.endereco.localeCompare(b.endereco, 'pt-BR')
      || a.bombona.localeCompare(b.bombona, 'pt-BR')
  })
}
