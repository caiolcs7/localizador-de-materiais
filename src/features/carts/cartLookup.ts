import cartsSource from '../../data/cartsData.json'
import type { CartItem, LuminaireCart } from '../../types/cart'
import { equivalentAI, normalizeSearch } from '../../utils/normalize'

export const cartsStorageKey = 'lm-carts-data-v2'

const cart948920ReplacementByCode = new Map<string, { codigo: string; descritivo: string }>([
  ['ITARLSM004AC', { codigo: 'ITARLSM004BC', descritivo: 'ARRUELA AC BICROMATIZADO LISA M4 - PESO UN: 0,00029 KG' }],
  ['ITARPRM04AC', { codigo: 'ITARPRM04BC', descritivo: 'ARRUELA AC BICROMATIZADO PRESSAO M4 - PESO UN: 0,00018 KG' }],
  ['ITPFPHM510PAAC', { codigo: 'ITPFPHM510PABC', descritivo: 'PARAFUSO AC PHILLIPS AC CAB PAN M5 10MM (BICROMATIZADO) - PESO UN: 0,00276 KG' }],
  ['ITPFPHM408PAAC', { codigo: 'ITPFPHM408PABC', descritivo: 'PARAFUSO AC PHILLIPS CAB PAN M4 08MM (BICROMATIZADO) - PESO UN: 0,0015 KG' }],
])

function normalizeCartsForLookup(input: LuminaireCart[]) {
  return input.map(cart => ({
    ...cart,
    sourceSheet: cart.sourceSheet || cart.nome,
    items: (cart.items ?? []).map(sourceItem => {
      const replacement = cart.id === 'luminaria-948-920'
        ? cart948920ReplacementByCode.get(normalizeSearch(sourceItem.codigo))
        : undefined
      return replacement ? { ...sourceItem, ...replacement } : sourceItem
    }),
  }))
}

const defaultCarts = normalizeCartsForLookup(cartsSource as LuminaireCart[])

export function loadCurrentCarts(storageValue?: string | null): LuminaireCart[] {
  try {
    const raw = storageValue === undefined
      ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(cartsStorageKey))
      : storageValue
    if (!raw) return defaultCarts
    const parsed = JSON.parse(raw) as LuminaireCart[]
    if (!Array.isArray(parsed) || !parsed.length) return defaultCarts
    return normalizeCartsForLookup(parsed)
  } catch {
    return defaultCarts
  }
}

export type CartMembership = {
  cartId: string
  cartName: string
  sourceSheet: string
  itemCode: string
  match: 'exact' | 'equivalent'
}

export function findCartMemberships(rawCode: string, carts: LuminaireCart[] = loadCurrentCarts()): CartMembership[] {
  const code = rawCode.trim()
  const normalized = normalizeSearch(code)
  if (!normalized) return []

  const memberships: CartMembership[] = []
  for (const cart of carts) {
    let best: CartMembership | null = null
    for (const item of cart.items ?? []) {
      const exact = normalizeSearch(item.codigo) === normalized
      const equivalent = !exact && equivalentAI(item.codigo, code)
      if (!exact && !equivalent) continue
      const candidate: CartMembership = {
        cartId: cart.id,
        cartName: cart.nome,
        sourceSheet: cart.sourceSheet || cart.nome,
        itemCode: item.codigo,
        match: exact ? 'exact' : 'equivalent',
      }
      if (exact) {
        best = candidate
        break
      }
      best ??= candidate
    }
    if (best) memberships.push(best)
  }

  return memberships.sort((a, b) => a.cartName.localeCompare(b.cartName, 'pt-BR'))
}

export type KnownCartCode = {
  codigo: string
  descritivo: string | null
  carts: string[]
}

export function collectKnownCartCodes(carts: LuminaireCart[] = loadCurrentCarts()): KnownCartCode[] {
  const byCode = new Map<string, { codigo: string; descritivo: string | null; carts: Set<string> }>()

  for (const cart of carts) {
    for (const item of cart.items ?? []) {
      const key = normalizeSearch(item.codigo)
      if (!key) continue
      const existing = byCode.get(key)
      if (existing) {
        existing.carts.add(cart.nome)
        if (!existing.descritivo && item.descritivo?.trim()) existing.descritivo = item.descritivo.trim()
      } else {
        byCode.set(key, {
          codigo: item.codigo.trim().toUpperCase(),
          descritivo: item.descritivo?.trim() || null,
          carts: new Set([cart.nome]),
        })
      }
    }
  }

  return [...byCode.values()]
    .map(entry => ({ ...entry, carts: [...entry.carts].sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))
}

export function cartItemMatchesCode(item: CartItem, code: string) {
  return normalizeSearch(item.codigo) === normalizeSearch(code) || equivalentAI(item.codigo, code)
}
