export const normalizeSearch = (value: string) =>
  value.trim().toUpperCase().replace(/[\s._\-\/]+/g, '')

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
