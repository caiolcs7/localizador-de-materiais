export const normalizeSearch = (value: string) =>
  value.trim().toUpperCase().replace(/[\s._\-\/]+/g, '')

export const cleanScannedCode = (value: string) => {
  let cleaned = value
    .toUpperCase()
    .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD\u25A0-\u25FF]/g, '')
    .replace(/[^A-Z0-9]/g, '')

  if (cleaned.startsWith('251')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('371')) cleaned = cleaned.slice(0, -3)

  return cleaned
}

export const formatBombona = (value: string) =>
  value.trim().toUpperCase().replace(/B(\d{1,3})(?!\d)/g, (_match, digits: string) => `B${digits.padStart(3, '0')}`)

export const canonicalAI = (value: string) => {
  const n = normalizeSearch(value)
  if (n.endsWith('AI4') || n.endsWith('AI6')) return n.slice(0, -3) + 'AI#'
  return n
}

export const equivalentAI = (a: string, b: string) => {
  const na = normalizeSearch(a)
  const nb = normalizeSearch(b)
  if (na === nb) return false
  return canonicalAI(na) === canonicalAI(nb) && /AI[46]$/.test(na) && /AI[46]$/.test(nb)
}

export const inferRua = (bombona: string) => bombona.toUpperCase().match(/^(R\d+)/)?.[1] ?? null
