import type { LuminaireCart } from '../../types/cart'
import imageMap from '../../data/luminaireImages.json'

const imageByCartId = imageMap as Record<string, string>

export function getLuminaireImage(cart?: Pick<LuminaireCart, 'id'>) {
  if (!cart) return null
  const path = imageByCartId[cart.id]
  return path ? `${import.meta.env.BASE_URL}${path}` : null
}
