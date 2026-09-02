import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const carts = [
  ...JSON.parse(readFileSync(resolve(root, 'src/data/cartsData.json'), 'utf8')),
  JSON.parse(readFileSync(resolve(root, 'src/data/cart016017.json'), 'utf8')),
]
const imageMap = JSON.parse(readFileSync(resolve(root, 'src/data/luminaireImages.json'), 'utf8'))
const expected = {
  '010-baby-mini-baby': 'luminarias/lum-010.webp',
  'luminaria-016-017': [
    'luminarias/lum-016-hero.webp',
    'luminarias/lum-016-profile.webp',
    'luminarias/lum-017.webp',
  ],
  'luminaria-014': 'luminarias/lum-014.webp',
  'luminaria-035': 'luminarias/lum-035.webp',
  'luminaria-254': 'luminarias/lum-254.webp',
  'luminaria-948-920': 'luminarias/lum-948.webp',
  'luminaria-984': 'luminarias/lum-984.webp',
  'luminaria-avf': 'luminarias/lum-avf.webp',
  'luminaria-cas': 'luminarias/lum-cas.webp',
  'luminaria-erj': 'luminarias/lum-erj-rear.webp',
  'luminaria-l75': 'luminarias/lum-l75.webp',
  'luminaria-mas': 'luminarias/lum-mas.webp'
}

const actualEntries = Object.entries(imageMap).sort(([a], [b]) => a.localeCompare(b))
const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b))
if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
  throw new Error('O mapa de imagens não corresponde às 12 luminárias cadastradas.')
}

const cartIds = new Set(carts.map(cart => cart.id))
let mappedImageCount = 0
for (const [cartId, source] of actualEntries) {
  if (!cartIds.has(cartId)) throw new Error(`Carrinho inexistente no mapa de imagens: ${cartId}`)
  const paths = Array.isArray(source) ? source : [source]
  for (const relativePath of paths) {
    const filePath = resolve(root, 'public', relativePath)
    const header = readFileSync(filePath).subarray(0, 12)
    if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') {
      throw new Error(`Imagem inválida: ${relativePath}`)
    }
    if (statSync(filePath).size < 10_000) throw new Error(`Imagem pequena ou incompleta: ${relativePath}`)
    mappedImageCount += 1
  }
}

const erjGallery = [
  'luminarias/lum-erj-front.webp',
  'luminarias/lum-erj-side.webp',
  'luminarias/lum-erj-rear.webp',
]
for (const relativePath of erjGallery) {
  const filePath = resolve(root, 'public', relativePath)
  const header = readFileSync(filePath).subarray(0, 12)
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`Foto da galeria ERJ inválida: ${relativePath}`)
  }
  if (statSync(filePath).size < 10_000) throw new Error(`Foto da galeria ERJ pequena ou incompleta: ${relativePath}`)
}

console.log(`OK: 12 luminárias associadas; ${mappedImageCount + erjGallery.length - 1} fotos WEBP válidas, incluindo galerias da 016/017 e ERJ.`)
