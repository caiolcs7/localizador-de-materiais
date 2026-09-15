import type { InventoryLocation } from '../../types/inventory'

const STOCK_EXCEPTION_TERMS = ['PARAFUSO', 'PORCA', 'ARRUELA', 'TERMINAL'] as const
const VERIFIED_BOMBONA = /^R\d+B\d{3}S?$/i

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function hasVerifiedBombona(bombona: string | null | undefined) {
  return VERIFIED_BOMBONA.test(bombona?.trim() ?? '')
}

export function isStockVisibilityException(
  item: Pick<InventoryLocation, 'bombona' | 'descritivo'>,
  resolvedDescription?: string | null,
) {
  if (!hasVerifiedBombona(item.bombona)) return false
  const description = fold(resolvedDescription ?? item.descritivo ?? '')
  return STOCK_EXCEPTION_TERMS.some(term => description.includes(term))
}

export function isVisibleWithStockFilter(
  item: Pick<InventoryLocation, 'bombona' | 'descritivo' | 'quantidade'>,
  resolvedDescription?: string | null,
) {
  return (item.quantidade ?? 0) > 0 || isStockVisibilityException(item, resolvedDescription)
}
