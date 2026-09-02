import type { CartItem, LuminaireCart } from '../../types/cart'
import { equivalentAI, normalizeSearch } from '../../utils/normalize'
import { cartsStorageKey, loadCurrentCarts } from './cartData'

export { cartsStorageKey, loadCurrentCarts }

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
