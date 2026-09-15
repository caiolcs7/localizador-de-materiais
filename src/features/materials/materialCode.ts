const cleanCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

const materialSuffixes = ['AI4', 'AI6', 'AC', 'BC'] as const

type MaterialCode = typeof materialSuffixes[number]
type Drive = 'PHILLIPS' | 'FENDA' | 'ALLEN' | 'SEXTAVADO' | null
type Head = 'PAN' | 'CILINDRICA' | 'ESC' | null

type ParsedMaterial = {
  code: string
  kind: 'PARAFUSO' | 'ARRUELA' | 'PORCA' | 'RIVKLE' | 'OUTRO'
  drive?: Drive
  washerType?: 'LISA' | 'SERRILHADA' | 'PRESSAO' | 'ESPECIAL'
  nutType?: 'SEXTAVADA' | null
  diameter?: string | null
  length?: string | null
  metric?: boolean
  head?: Head
  selfTapping?: boolean
  partialThread?: boolean
  material?: MaterialCode | null
  explicit304?: boolean
}

function stripMaterial(code: string) {
  for (const suffix of materialSuffixes) {
    if (code.endsWith(suffix)) return { body: code.slice(0, -suffix.length), material: suffix as MaterialCode }
  }
  // Legacy/incomplete suffix AI means the inox grade digit is missing.
  // Treat it as incomplete material data, never as the standalone complement A.
  if (code.endsWith('AI')) return { body: code.slice(0, -2), material: null as MaterialCode | null }
  return { body: code, material: null as MaterialCode | null }
}

function parseMetricScrewDigits(rawDigits: string) {
  const digits = rawDigits.replace(/^0+(?=\d)/, '')
  const twoDigitDiameters = ['30', '25', '20', '16', '14', '12', '10']
  const diameter = twoDigitDiameters.find(candidate => digits.startsWith(candidate) && digits.length - candidate.length >= 2) ?? digits[0]
  if (!diameter) return null
  const length = digits.slice(diameter.length)
  if (!/^\d+$/.test(length) || !length) return null
  return { diameter: String(Number(diameter)), length }
}

function parseNominalSize(rawDigits: string) {
  if (!/^\d+$/.test(rawDigits)) return null
  const value = Number(rawDigits)
  return Number.isFinite(value) && value > 0 ? String(value) : null
}

function parseNonMetricScrewDigits(rawDigits: string) {
  if (!/^\d{3,}$/.test(rawDigits)) return null
  const diameterDigits = rawDigits.slice(0, 2)
  const length = rawDigits.slice(2)
  const diameter = `${Number(diameterDigits[0])},${diameterDigits[1]}`
  return { diameter, length }
}

function complementFlags(raw: string, allen = false) {
  let value = raw
  let head: Head = allen ? 'CILINDRICA' : null
  let selfTapping = false
  let partialThread = false

  // Legacy partial-thread codes occur both as RP and as PA+RP4/RP6.
  if (value.includes('RP')) {
    partialThread = true
    head = 'PAN'
  }

  if (value.includes('AE')) {
    head = 'ESC'
    selfTapping = true
  } else if (value.includes('AP')) {
    head = 'PAN'
    selfTapping = true
  } else {
    if (value.includes('ES')) head = 'ESC'
    else if (value.includes('CI')) head = 'CILINDRICA'
    else if (value.includes('PA')) head = 'PAN'

    // A by itself means auto-tapping; avoid treating the A inside PA/AE/AP as standalone.
    const withoutKnown = value.replace(/AE|AP|PA|CI|ES|RP/g, '')
    if (withoutKnown.includes('A')) selfTapping = true
  }

  return { head, selfTapping, partialThread }
}

function screwFamily(code: string) {
  const families = [
    { prefix: 'ITPFPHM', drive: 'PHILLIPS' as const, metric: true },
    { prefix: 'ITPFPH', drive: 'PHILLIPS' as const, metric: false },
    { prefix: 'ITPFFEM', drive: 'FENDA' as const, metric: true },
    { prefix: 'ITPFFE', drive: 'FENDA' as const, metric: false },
    { prefix: 'ITPFALLM', drive: 'ALLEN' as const, metric: true },
    { prefix: 'ITPFSEM', drive: 'SEXTAVADO' as const, metric: true },
  ]
  return families.find(item => code.startsWith(item.prefix)) ?? null
}

export function parseMaterialCode(rawCode: string): ParsedMaterial | null {
  const code = cleanCode(rawCode)
  if (!code) return null

  const screw = screwFamily(code)
  if (screw) {
    const { body, material } = stripMaterial(code)
    const rest = body.slice(screw.prefix.length)
    const match = rest.match(/^(\d+)(.*)$/)
    if (!match) return null
    const dimensions = screw.metric ? parseMetricScrewDigits(match[1]) : parseNonMetricScrewDigits(match[1])
    if (!dimensions) return null
    const flags = complementFlags(match[2], screw.drive === 'ALLEN')
    return {
      code,
      kind: 'PARAFUSO',
      drive: screw.drive,
      diameter: dimensions.diameter,
      length: dimensions.length,
      metric: screw.metric,
      material,
      ...flags,
    }
  }

  const washer = code.match(/^ITAR(LS|SR|PR|LE)M(\d+)(.*)$/)
  if (washer) {
    const { body, material } = stripMaterial(code)
    const bodyMatch = body.match(/^ITAR(LS|SR|PR|LE)M(\d+)(.*)$/)
    if (!bodyMatch) return null
    const size = parseNominalSize(bodyMatch[2])
    if (!size) return null
    const washerType = ({ LS: 'LISA', SR: 'SERRILHADA', PR: 'PRESSAO', LE: 'ESPECIAL' } as const)[bodyMatch[1] as 'LS' | 'SR' | 'PR' | 'LE']
    return { code, kind: 'ARRUELA', washerType, diameter: size, metric: true, material }
  }

  const nut = code.match(/^ITPRCSEM(\d+)(.*)$/)
  if (nut) {
    const { body, material } = stripMaterial(code)
    const bodyMatch = body.match(/^ITPRCSEM(\d+)(.*)$/)
    if (!bodyMatch) return null
    const size = parseNominalSize(bodyMatch[1])
    if (!size) return null
    return { code, kind: 'PORCA', nutType: 'SEXTAVADA', diameter: size, metric: true, material }
  }

  // Other nut families: the subtype is intentionally not guessed. We only expose facts encoded unambiguously.
  const genericNut = code.match(/^ITPRC[A-Z]*M(\d+)(.*)$/)
  if (genericNut) {
    const { body, material } = stripMaterial(code)
    const bodyMatch = body.match(/^ITPRC[A-Z]*M(\d+)(.*)$/)
    const size = bodyMatch ? parseNominalSize(bodyMatch[1]) : null
    if (size) return { code, kind: 'PORCA', nutType: null, diameter: size, metric: true, material }
  }

  // Other screw families: only diameter/length/material are inferred; drive/head remain unknown.
  const genericScrew = code.match(/^ITPF[A-Z]*M(\d+)(.*)$/)
  if (genericScrew) {
    const { body, material } = stripMaterial(code)
    const bodyMatch = body.match(/^ITPF[A-Z]*M(\d+)(.*)$/)
    if (bodyMatch) {
      const dimensions = parseMetricScrewDigits(bodyMatch[1])
      if (dimensions) return { code, kind: 'PARAFUSO', drive: null, diameter: dimensions.diameter, length: dimensions.length, metric: true, material }
    }
  }

  if (code.startsWith('ITRKCHAB')) return { code, kind: 'RIVKLE' }
  if (code.startsWith('ITRKCHFE')) return { code, kind: 'RIVKLE' }

  return { code, kind: 'OUTRO' }
}

function materialPrefix(material: MaterialCode | null | undefined, noun: 'PARAFUSO' | 'ARRUELA' | 'PORCA') {
  if (material === 'AI4') return noun === 'PARAFUSO' ? 'PARAFUSO AI' : `${noun} AI`
  if (material === 'AI6') return noun === 'PARAFUSO' ? 'PARAFUSO AI 316' : `${noun} AI 316`
  if (material === 'BC') return `${noun} AC`
  if (material === 'AC') return `${noun} AC`
  return noun
}

function finishSuffix(material: MaterialCode | null | undefined) {
  return material === 'BC' ? ' (BICROMATIZADO)' : ''
}

function screwDescription(parsed: ParsedMaterial) {
  if (!parsed.diameter || !parsed.length) return null
  const parts = [materialPrefix(parsed.material, 'PARAFUSO')]
  if (parsed.drive) parts.push(parsed.drive)
  if (parsed.head === 'PAN') parts.push('CAB PAN')
  else if (parsed.head === 'CILINDRICA') parts.push('CAB CILINDRICA')
  else if (parsed.head === 'ESC') parts.push('CAB ESC')

  if (parsed.metric) parts.push(`M${parsed.diameter}`, `${parsed.length}MM`)
  else parts.push(`${parsed.diameter} MM`, `${parsed.length}MM`)

  if (parsed.selfTapping) parts.push('AUTO ATARR')
  if (parsed.partialThread) parts.push('ROSCA PARCIAL')
  return `${parts.join(' ')}${finishSuffix(parsed.material)}`
}

export function inferMaterialDescription(rawCode: string): string | null {
  const code = cleanCode(rawCode)
  const parsed = parseMaterialCode(code)
  if (!parsed) return null

  if (parsed.kind === 'PARAFUSO') return screwDescription(parsed)

  if (parsed.kind === 'ARRUELA' && parsed.diameter && parsed.washerType) {
    if (parsed.material === 'BC') return `ARRUELA AC BICROMATIZADO ${parsed.washerType} M${parsed.diameter}`
    const material = parsed.material === 'AI6' ? ' AI 316' : parsed.material === 'AI4' ? ' AI' : parsed.material === 'AC' ? ' AC' : ''
    return `ARRUELA ${parsed.washerType}${material} M${parsed.diameter}`
  }

  if (parsed.kind === 'PORCA' && parsed.diameter) {
    const type = parsed.nutType ? ` ${parsed.nutType}` : ''
    if (parsed.material === 'BC') return `PORCA AC${type} M${parsed.diameter} (BICROMATIZADA)`
    const material = parsed.material === 'AI6' ? ' AI 316' : parsed.material === 'AI4' ? ' AI' : parsed.material === 'AC' ? ' AC' : ''
    return `PORCA${material}${type} M${parsed.diameter}`
  }

  if (code.startsWith('ITRKCHAB')) return 'RIVKLE CAB CHATA, ABERTO - ESPECIFICAÇÃO TÉCNICA NÃO CONFIRMADA'
  if (code.startsWith('ITRKCHFE')) return 'RIVKLE CAB CHATA, FECHADO - ESPECIFICAÇÃO TÉCNICA NÃO CONFIRMADA'

  const fixed: Record<string, string> = {
    MISTURADO: 'MATERIAIS MISTURADOS',
    'PARAFUSOCOMORINGVERMELHO': 'PARAFUSO COM O-RING VERMELHO',
    REVIKLE: 'RIVKLE SEM ESPECIFICAÇÃO TÉCNICA CONFIRMADA',
    REVKLE: 'RIVKLE SEM ESPECIFICAÇÃO TÉCNICA CONFIRMADA',
    REVKLW: 'RIVKLE SEM ESPECIFICAÇÃO TÉCNICA CONFIRMADA',
    'SEMCÓDIGO': 'MATERIAL SEM CÓDIGO IDENTIFICADO',
    'SEMCODIGO': 'MATERIAL SEM CÓDIGO IDENTIFICADO',
    'TERMINALSEMCODIGO': 'TERMINAL SEM CÓDIGO IDENTIFICADO',
    VAZIO: 'ENDEREÇO VAZIO',
  }
  if (fixed[code]) return fixed[code]

  // Unknown legacy codes get an explicit uncertainty marker rather than an invented technical identity.
  if (/^(ITC|J\d)/.test(code)) return 'DESCRITIVO TÉCNICO NÃO IDENTIFICADO COM SEGURANÇA'
  return null
}

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function canonicalToken(token: string) {
  const aliases: Record<string, string> = {
    CABOS: 'CABO',
    PARAFUSOS: 'PARAFUSO',
    PORCAS: 'PORCA',
    ARRUELAS: 'ARRUELA',
    TERMINAIS: 'TERMINAL',
    CABECA: 'CAB',
    CABEÇA: 'CAB',
    PANELA: 'PAN',
    PHILIPS: 'PHILLIPS',
    ESCARIADA: 'ESC',
    ESCARIADO: 'ESC',
    ESCARIADOA: 'ESC',
    CILINDRICO: 'CILINDRICA',
    CILINDRICA: 'CILINDRICA',
    PRESSAO: 'PRESSAO',
    SEXTAVADA: 'SEXTAVADO',
    BICROMATIZADA: 'BICROMATIZADO',
    ATARR: 'TARRAXANTE',
    ATARRAXANTE: 'TARRAXANTE',
    AUTOTARRAXANTE: 'TARRAXANTE',
    TARRAXANTE: 'TARRAXANTE',
    INOXIDAVEL: 'INOX',
  }
  return aliases[token] ?? token
}

const stopTokens = new Set(['X', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'COM', 'E', 'EM', 'CAB'])

function tokenize(value: string, keepCab = true) {
  const rawTokens = fold(value).replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const tokens: string[] = []
  for (const raw of rawTokens) {
    const metricPair = raw.match(/^M0*(\d+)X0*(\d+)$/)
    if (metricPair) {
      tokens.push(`M${Number(metricPair[1])}`, String(Number(metricPair[2])))
      continue
    }
    const dimension = raw.match(/^0*(\d+(?:[.,]\d+)?)MM$/)
    if (dimension) {
      const number = dimension[1].replace(',', '.')
      tokens.push(String(Number(number)))
      continue
    }
    const canonical = canonicalToken(raw)
    if ((!keepCab && canonical === 'CAB') || stopTokens.has(canonical) && canonical !== 'CAB') continue
    tokens.push(canonical)
  }
  return tokens
}

function codeSearchAliases(rawCode: string) {
  const parsed = parseMaterialCode(rawCode)
  if (!parsed) return []
  const aliases: string[] = []

  if (parsed.kind === 'PARAFUSO') aliases.push('PARAFUSO')
  if (parsed.kind === 'ARRUELA') aliases.push('ARRUELA')
  if (parsed.kind === 'PORCA') aliases.push('PORCA')
  if (parsed.drive) aliases.push(parsed.drive)
  if (parsed.washerType) aliases.push(parsed.washerType)
  if (parsed.nutType) aliases.push(parsed.nutType, 'SEXTAVADO')
  if (parsed.diameter) aliases.push(parsed.metric ? `M${parsed.diameter}` : parsed.diameter)
  if (parsed.length) aliases.push(String(Number(parsed.length)))
  if (parsed.head === 'PAN') aliases.push('CAB', 'PAN', 'PANELA')
  if (parsed.head === 'CILINDRICA') aliases.push('CAB', 'CILINDRICA')
  if (parsed.head === 'ESC') aliases.push('CAB', 'ESC', 'ESCARIADA')
  if (parsed.selfTapping) aliases.push('AUTO', 'TARRAXANTE', 'AUTOTARRAXANTE')
  if (parsed.partialThread) aliases.push('ROSCA', 'PARCIAL')

  if (parsed.material === 'AI4') aliases.push('AI', 'AI4', 'ACO', 'INOX', '304')
  if (parsed.material === 'AI6') aliases.push('AI', 'AI6', 'ACO', 'INOX', '316')
  if (parsed.material === 'AC') aliases.push('AC', 'ACO', 'CARBONO')
  if (parsed.material === 'BC') aliases.push('BC', 'AC', 'ACO', 'CARBONO', 'BICROMATIZADO')

  return aliases
}

export function matchesMaterialSearch(rawCode: string, description: string | null | undefined, rawQuery: string) {
  const queryTokens = tokenize(rawQuery)
  if (!queryTokens.length) return false

  const inferred = inferMaterialDescription(rawCode)
  const documentTokens = new Set([
    ...tokenize(description ?? ''),
    ...tokenize(inferred ?? ''),
    ...codeSearchAliases(rawCode).map(canonicalToken),
  ])

  return queryTokens.every(token => documentTokens.has(canonicalToken(token)))
}
