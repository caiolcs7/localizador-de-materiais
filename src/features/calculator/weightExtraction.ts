export type WeightUnit = 'g' | 'kg'

export type WeightExtraction =
  | {
      valid: true
      originalValue: string
      originalUnit: string
      normalizedUnit: WeightUnit
      grams: number
    }
  | {
      valid: false
      reason: 'not-found' | 'ambiguous' | 'invalid'
    }

type WeightCandidate = Extract<WeightExtraction, { valid: true }>

const WEIGHT_PATTERN = /(?:^|[^\p{L}\p{N}])([0-9]+(?:[.,][0-9]+)?)\s*(kg|quilogramas?|quilos?|gramas?|gr|g)\b/giu

function parseLocalizedDecimal(value: string): number | null {
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeWeightUnit(unit: string): WeightUnit {
  return /^(?:kg|quilogramas?|quilos?)$/i.test(unit) ? 'kg' : 'g'
}

function toCandidate(value: string, unit: string): WeightCandidate | null {
  const numericValue = parseLocalizedDecimal(value)
  if (numericValue === null) return null
  const normalizedUnit = normalizeWeightUnit(unit)
  const grams = normalizedUnit === 'kg' ? numericValue * 1000 : numericValue
  if (!Number.isFinite(grams) || grams <= 0) return null
  return {
    valid: true,
    originalValue: value,
    originalUnit: unit,
    normalizedUnit,
    grams,
  }
}

export function extractWeightFromDescription(description: unknown): WeightExtraction {
  const text = String(description ?? '').trim()
  if (!text) return { valid: false, reason: 'not-found' }

  const matches = [...text.matchAll(WEIGHT_PATTERN)]
  if (!matches.length) return { valid: false, reason: 'not-found' }

  const candidates = matches
    .map(match => toCandidate(match[1], match[2]))
    .filter((candidate): candidate is WeightCandidate => candidate !== null)
  if (!candidates.length) return { valid: false, reason: 'invalid' }

  const distinctWeights = new Set(candidates.map(candidate => candidate.grams))
  if (distinctWeights.size !== 1) return { valid: false, reason: 'ambiguous' }
  return candidates[0]
}

export function formatGramsInput(grams: number): string {
  if (!Number.isFinite(grams)) return ''
  return String(grams).replace('.', ',')
}

export function formatGrams(grams: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 9,
  }).format(grams)} g`
}
