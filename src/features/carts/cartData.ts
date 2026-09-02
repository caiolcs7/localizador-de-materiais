import cartsSource from '../../data/cartsData.json'
import cart016017Source from '../../data/cart016017.json'
import cartGhbSource from '../../data/cartGHB.json'
import type { LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'

export const cartsStorageKey = 'lm-carts-data-v2'
export const cart016017MigrationKey = 'lm-carts-migration-016-017-v1'
export const cart016017Id = 'luminaria-016-017'
export const cartGhbMigrationKey = 'lm-carts-migration-ghb-v1'
export const cartGhbId = 'luminaria-ghb'

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
  cartGhbSource as LuminaireCart,
])

const required016017 = defaultCarts.find(cart => cart.id === cart016017Id)!
const requiredGhb = defaultCarts.find(cart => cart.id === cartGhbId)!

function browserStorageValue(key: string) {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
}

function browserStorageSet(key: string, value: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
}

export function loadCurrentCarts(
  storageValue?: string | null,
  migrationApplied?: boolean,
  ghbMigrationApplied?: boolean,
): LuminaireCart[] {
  const browserMode = storageValue === undefined

  try {
    const raw = browserMode ? browserStorageValue(cartsStorageKey) : storageValue
    if (!raw) {
      if (browserMode) browserStorageSet(cartGhbMigrationKey, '1')
      return defaultCarts
    }

    const parsed = JSON.parse(raw) as LuminaireCart[]
    if (!Array.isArray(parsed) || !parsed.length) {
      if (browserMode) browserStorageSet(cartGhbMigrationKey, '1')
      return defaultCarts
    }

    let normalized = normalizeCarts(parsed)

    const alreadyMigrated = migrationApplied ?? browserStorageValue(cart016017MigrationKey) === '1'
    if (!alreadyMigrated && !normalized.some(cart => cart.id === cart016017Id)) {
      normalized = [...normalized, required016017]
    }

    const ghbAlreadyMigrated = ghbMigrationApplied ?? browserStorageValue(cartGhbMigrationKey) === '1'
    if (!ghbAlreadyMigrated) {
      if (!normalized.some(cart => cart.id === cartGhbId)) {
        normalized = [...normalized, requiredGhb]
      }
      if (browserMode) {
        browserStorageSet(cartsStorageKey, JSON.stringify(normalized))
        browserStorageSet(cartGhbMigrationKey, '1')
      }
    }

    return normalized
  } catch {
    if (browserMode) browserStorageSet(cartGhbMigrationKey, '1')
    return defaultCarts
  }
}
