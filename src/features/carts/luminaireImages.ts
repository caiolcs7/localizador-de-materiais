import type { LuminaireCart } from '../../types/cart'
import imageMap from '../../data/luminaireImages.json'

const imageByCartId = imageMap as Record<string, string | string[]>

export function getLuminaireImages(cart?: Pick<LuminaireCart, 'id'>) {
  if (!cart) return []
  const source = imageByCartId[cart.id]
  const paths = Array.isArray(source) ? source : source ? [source] : []
  return paths.map(path => `${import.meta.env.BASE_URL}${path}`)
}

export function getLuminaireImage(cart?: Pick<LuminaireCart, 'id'>) {
  return getLuminaireImages(cart)[0] ?? null
}
