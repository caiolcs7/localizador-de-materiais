import cartsSource from '../../data/cartsData.json'
import cart016017Source from '../../data/cart016017.json'
import type { LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'

export const cartsStorageKey = 'lm-carts-data-v2'
export const cart016017MigrationKey = 'lm-carts-migration-016-017-v1'
export const cart016017Id = 'luminaria-016-017'

const cart948920ReplacementByCode = new Map<string, { codigo: string; descritivo: string }>([
  ['ITARLSM004AC', { codigo: 'ITARLSM004BC', descritivo: 'ARRUELA AC BICROMATIZADO LISA M4 - PESO UN: 0,00029 KG' }],
  ['ITARPRM04AC', { codigo: 'ITARPRM04BC', descritivo: 'ARRUELA AC BICROMATIZADO PRESSAO M4 - PESO UN: 0,00018 KG' }],
  ['ITPFPHM510PAAC', { codigo: 'ITPFPHM510PABC', descritivo: 'PARAFUSO AC PHILLIPS AC CAB PAN M5 10MM (BICROMATIZADO) - PESO UN: 0,00276 KG' }],
  ['ITPFPHM408PAAC', { codigo: 'ITPFPHM408PABC', descritivo: 'PARAFUSO AC PHILLIPS CAB PAN M4 08MM (BICROMATIZADO) - PESO UN: 0,0015 KG' }],
])

export function normalizeCarts(input: LuminaireCart[]) {
  return input.map(cart => ({
    ...cart,
    sourceSheet: cart.sourceSheet || cart.nome,
    items: (cart.items ?? []).map((sourceItem, index) => {
      const replacement = cart.id === 'luminaria-948-920'
        ? cart948920ReplacementByCode.get(normalizeSearch(sourceItem.codigo))
        : undefined
      const item = replacement ? { ...sourceItem, ...replacement } : sourceItem
      return {
        ...item,
        id: item.id ?? `${cart.id}-${String(index + 1).padStart(3, '0')}-${normalizeSearch(item.codigo)}`,
      }
    }),
  }))
}

export const defaultCarts = normalizeCarts([
  ...(cartsSource as LuminaireCart[]),
  cart016017Source as LuminaireCart,
])

const required016017 = defaultCarts.find(cart => cart.id === cart016017Id)!

function browserStorageValue(key: string) {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
}

export function loadCurrentCarts(storageValue?: string | null, migrationApplied?: boolean): LuminaireCart[] {
  try {
    const raw = storageValue === undefined ? browserStorageValue(cartsStorageKey) : storageValue
    if (!raw) return defaultCarts

    const parsed = JSON.parse(raw) as LuminaireCart[]
    if (!Array.isArray(parsed) || !parsed.length) return defaultCarts

    const normalized = normalizeCarts(parsed)
    const alreadyMigrated = migrationApplied ?? browserStorageValue(cart016017MigrationKey) === '1'
    if (!alreadyMigrated && !normalized.some(cart => cart.id === cart016017Id)) {
      return [...normalized, required016017]
    }
    return normalized
  } catch {
    return defaultCarts
  }
}
