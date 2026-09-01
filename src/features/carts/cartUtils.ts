import type { InventoryLocation } from '../../types/inventory'
import type { CartItem } from '../../types/cart'
import { equivalentAI, normalizeSearch } from '../../utils/normalize'

const CATEGORY_RULES: Array<{ label: string; tokens: string[] }> = [
  // Regras mais específicas vêm antes das genéricas. Ex.: uma vedação pode
  // mencionar "parafusos" no descritivo sem ser um parafuso.
  { label: 'Vedações', tokens: ['VEDACAO', 'VEDAÇÃO'] },
  { label: 'Rivkles', tokens: ['RIVKLE'] },
  { label: 'Rebites', tokens: ['REBITE', 'REBIT'] },
  { label: 'Terminais', tokens: ['TERMINAL'] },
  { label: 'Porcas', tokens: ['PORCA'] },
  { label: 'Arruelas', tokens: ['ARRUELA'] },
  { label: 'Pinos', tokens: ['PINO'] },
  { label: 'Buchas', tokens: ['BUCHA'] },
  { label: 'Abraçadeiras', tokens: ['ABRACADEIRA', 'ABRAÇADEIRA'] },
  { label: 'Conectores', tokens: ['CONECTOR'] },
  { label: 'Suportes', tokens: ['SUPORTE'] },
  { label: 'Presilhas', tokens: ['PRESILHA'] },
  { label: 'Molas', tokens: ['MOLA'] },
  { label: 'Cabos', tokens: ['CABO'] },
  { label: 'Parafusos', tokens: ['PARAFUSO', 'PARAF'] }
]

export function categoryForItem(item: CartItem) {
  if (item.categoria?.trim()) return item.categoria.trim()
  const text = normalizeSearch(`${item.codigo} ${item.descritivo ?? ''}`)
  return CATEGORY_RULES.find(rule => rule.tokens.some(token => text.includes(normalizeSearch(token))))?.label ?? 'Outros'
}

export function findInventoryLocations(code: string, inventory: InventoryLocation[]) {
  const normalized = normalizeSearch(code)
  return inventory.filter(location => {
    const candidates = [location.codigo, ...(location.aliases ?? [])]
    return candidates.some(candidate => normalizeSearch(candidate) === normalized || equivalentAI(candidate, code))
  })
}

export function cartItemKey(cartId: string, item: CartItem, index: number) {
  return `${cartId}::${normalizeSearch(item.codigo)}::${item.id ?? item.linhaOrigem ?? index}`
}
