import cartsSource from '../../data/cartsData.json'
import type { LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'

export type MaterialVisualFamily =
  | 'flat-washer'
  | 'spring-washer'
  | 'serrated-washer'
  | 'retaining-ring'
  | 'pan-screw'
  | 'countersunk-screw'
  | 'self-tapping-pan-screw'
  | 'self-tapping-countersunk-screw'
  | 'socket-screw'
  | 'button-socket-screw'
  | 'hex-bolt'
  | 'hex-nut'
  | 'grounding-stud'
  | 'screw-washer-set'
  | 'ring-terminal'
  | 'spade-terminal'
  | 'pin-terminal'
  | 'rivnut-open'
  | 'rivnut-closed'
  | 'rivet-pack'
  | 'unavailable'

export type MaterialFinish = 'stainless' | 'bichromate' | 'steel' | 'blue' | 'yellow' | 'rubber' | 'mixed'

export type MaterialVisualSpec = {
  family: MaterialVisualFamily
  finish: MaterialFinish
  finishLabel: string
  sizeLabel: string | null
  verified: boolean
}

const carts = cartsSource as LuminaireCart[]

export const describedMaterials = new Map<string, string>()

for (const cart of carts) {
  for (const item of cart.items) {
    if (!item.descritivo?.trim()) continue
    const key = normalizeSearch(item.codigo)
    if (!describedMaterials.has(key)) describedMaterials.set(key, item.descritivo.trim())
  }
}

export function getMaterialDescription(code: string, fallback?: string | null) {
  return fallback?.trim() || describedMaterials.get(normalizeSearch(code)) || null
}

function normalizeDescription(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function metricSize(text: string) {
  const metric = text.match(/\bM\s*0?(\d+)\b/)
  if (!metric) return null
  const afterMetric = text.slice((metric.index ?? 0) + metric[0].length)
  const length = afterMetric.match(/^\s*(?:X\s*)?(\d+(?:[.,]\d+)?)\s*MM\b/)
  return length ? `M${metric[1]} × ${length[1].replace('.', ',')} mm` : `M${metric[1]}`
}

function selfTappingSize(text: string) {
  const match = text.match(/\b(3[.,]9|4[.,]2)\s*MM\s+(\d+(?:[.,]\d+)?)\s*MM\b/)
  return match ? `Ø ${match[1].replace('.', ',')} × ${match[2].replace('.', ',')} mm` : null
}

function terminalSize(text: string) {
  const cable = text.match(/\b(1[.,]5|4[.,]0)\s*MM\s*[–-]\s*(2[.,]5|6[.,]0)\s*MM\b/)
  const dimension = text.match(/(?:DIM|SAPATA)\s*(\d+(?:[.,]\d+)?)\s*MM\b/)
  const pin = text.match(/COMP PINO\s*(\d+(?:[.,]\d+)?)\s*MM\b/)
  const parts = [
    cable ? `${cable[1].replace('.', ',')}–${cable[2].replace('.', ',')} mm²` : null,
    dimension ? `Ø ${dimension[1].replace('.', ',')} mm` : null,
    pin ? `pino ${pin[1].replace('.', ',')} mm` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function finishFor(text: string): Pick<MaterialVisualSpec, 'finish' | 'finishLabel'> {
  if (text.includes('AZUL')) return { finish: 'blue', finishLabel: 'Isolação azul' }
  if (text.includes('AMARELO')) return { finish: 'yellow', finishLabel: 'Isolação amarela' }
  if (text.includes('AI 316') || text.includes('INOX 316')) return { finish: 'stainless', finishLabel: 'Inox 316' }
  if (text.includes('AI 304') || text.includes('INOX 304')) return { finish: 'stainless', finishLabel: 'Inox 304' }
  if (text.includes('BICROMATIZADO')) return { finish: 'bichromate', finishLabel: 'Aço bicromatizado' }
  if (/\bAI\b|\bINOX\b/.test(text)) return { finish: 'stainless', finishLabel: 'Aço inox' }
  if (/\bAC\b/.test(text)) return { finish: 'steel', finishLabel: 'Aço' }
  return { finish: 'mixed', finishLabel: 'Material conforme descritivo' }
}

export function resolveMaterialVisual(code: string, description?: string | null): MaterialVisualSpec | null {
  const raw = getMaterialDescription(code, description)
  if (!raw) return null
  const text = normalizeDescription(raw)
  const finish = finishFor(text)
  const metric = metricSize(text)

  if (text.includes('VEDACAO')) {
    return { family: 'unavailable', finish: 'rubber', finishLabel: 'Material não especificado', sizeLabel: null, verified: false }
  }
  if (text.includes('REBIT SACO')) {
    return { family: 'rivet-pack', finish: 'mixed', finishLabel: 'Material não especificado', sizeLabel: 'Embalagem com 20', verified: false }
  }
  if (text.includes('ANEL AUTO RETENCAO') || text.includes('ARRUELA TRAVA EIXO')) {
    const shaft = text.match(/EIXO\s*(\d+(?:[.,]\d+)?)/)
    return { family: 'retaining-ring', ...finish, sizeLabel: shaft ? `Eixo Ø ${shaft[1].replace('.', ',')} mm` : null, verified: true }
  }
  if (text.includes('RIVKLE')) {
    return { family: text.includes('FECHADO') ? 'rivnut-closed' : 'rivnut-open', ...finish, sizeLabel: metric, verified: true }
  }
  if (text.includes('TERMINAL')) {
    const family = text.includes('OLHAL') ? 'ring-terminal' : text.includes('FEMEA') ? 'spade-terminal' : 'pin-terminal'
    return { family, ...finish, sizeLabel: terminalSize(text), verified: true }
  }
  if (text.includes('PINO ATERRAMENTO')) {
    return { family: 'grounding-stud', ...finish, sizeLabel: metric, verified: true }
  }
  if (text.includes('CJ 1 PARAFUSO') && text.includes('ARRUELA')) {
    return { family: 'screw-washer-set', ...finish, sizeLabel: metric, verified: true }
  }
  if (text.includes('ARRUELA')) {
    const family = text.includes('PRESSAO') ? 'spring-washer' : text.includes('SERR') ? 'serrated-washer' : 'flat-washer'
    return { family, ...finish, sizeLabel: metric, verified: true }
  }
  if (text.includes('PORCA') && text.includes('SEXTAVADA')) {
    return { family: 'hex-nut', ...finish, sizeLabel: metric, verified: true }
  }
  if (text.includes('PARAFUSO') || text.includes('PARAF ')) {
    if (text.includes('ALLEN') && text.includes('ABAULADA')) return { family: 'button-socket-screw', ...finish, sizeLabel: metric, verified: true }
    if (text.includes('ALLEN')) return { family: 'socket-screw', ...finish, sizeLabel: metric, verified: true }
    if (text.includes('SEXTAVADO')) return { family: 'hex-bolt', ...finish, sizeLabel: metric, verified: true }
    const selfTapping = text.includes('AUTO ATARR')
    const countersunk = text.includes('CAB ESC')
    const family = selfTapping
      ? countersunk ? 'self-tapping-countersunk-screw' : 'self-tapping-pan-screw'
      : countersunk ? 'countersunk-screw' : 'pan-screw'
    return { family, ...finish, sizeLabel: selfTappingSize(text) ?? metric, verified: true }
  }

  return { family: 'unavailable', ...finish, sizeLabel: metric, verified: false }
}
