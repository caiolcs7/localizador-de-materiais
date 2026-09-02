import type { CSSProperties } from 'react'

export type LuminaireTheme = {
  shortLabel: string
  primary: string
  secondary: string
  text: string
  border: string
  shadow: string
  split?: boolean
}

export type LuminaireThemeStyle = CSSProperties & {
  '--luminaire-primary': string
  '--luminaire-secondary': string
  '--luminaire-text': string
  '--luminaire-border': string
  '--luminaire-shadow': string
}

const fallbackTheme: LuminaireTheme = {
  shortLabel: 'LUM',
  primary: '#29313d',
  secondary: '#11161d',
  text: '#ffffff',
  border: 'rgba(255, 255, 255, .16)',
  shadow: 'rgba(17, 24, 39, .24)',
}

const themes: Record<string, LuminaireTheme> = {
  AVF: {
    shortLabel: 'AVF', primary: '#ff8a24', secondary: '#1264d7', text: '#ffffff',
    border: 'rgba(18, 100, 215, .36)', shadow: 'rgba(18, 100, 215, .25)', split: true,
  },
  '254': {
    shortLabel: '254', primary: '#ffe066', secondary: '#f4b900', text: '#2d2300',
    border: 'rgba(137, 99, 0, .34)', shadow: 'rgba(244, 185, 0, .30)',
  },
  '014': {
    shortLabel: '014', primary: '#ff922b', secondary: '#121212', text: '#ffffff',
    border: 'rgba(255, 146, 43, .40)', shadow: 'rgba(17, 17, 17, .28)', split: true,
  },
  '010': {
    shortLabel: '010', primary: '#ff8a24', secondary: '#d62828', text: '#ffffff',
    border: 'rgba(172, 28, 28, .38)', shadow: 'rgba(214, 40, 40, .26)', split: true,
  },
  ERJ: {
    shortLabel: 'ERJ', primary: '#173f78', secondary: '#071b3c', text: '#ffffff',
    border: 'rgba(73, 122, 190, .38)', shadow: 'rgba(7, 27, 60, .35)',
  },
  GHB: {
    shortLabel: 'GHB', primary: '#9fe2ff', secondary: '#42b9ee', text: '#07384f',
    border: 'rgba(38, 137, 181, .34)', shadow: 'rgba(66, 185, 238, .28)',
  },
  ERV: {
    shortLabel: 'ERV', primary: '#8c1720', secondary: '#44070c', text: '#ffffff',
    border: 'rgba(165, 48, 58, .38)', shadow: 'rgba(68, 7, 12, .35)',
  },
  '984': {
    shortLabel: '984', primary: '#ff9999', secondary: '#f05252', text: '#4b0b0b',
    border: 'rgba(190, 66, 66, .34)', shadow: 'rgba(240, 82, 82, .28)',
  },
  CAS: {
    shortLabel: 'CAS', primary: '#ffffff', secondary: '#e7e8eb', text: '#20242a',
    border: 'rgba(32, 36, 42, .22)', shadow: 'rgba(17, 24, 39, .15)',
  },
  '035': {
    shortLabel: '035', primary: '#68412d', secondary: '#2f180e', text: '#ffffff',
    border: 'rgba(106, 63, 41, .42)', shadow: 'rgba(47, 24, 14, .34)',
  },
  MAS: {
    shortLabel: 'MAS', primary: '#84e6d6', secondary: '#2ebba4', text: '#073a32',
    border: 'rgba(32, 151, 132, .35)', shadow: 'rgba(46, 187, 164, .25)',
  },
  L75: {
    shortLabel: 'L75', primary: '#52c95d', secondary: '#187b2b', text: '#ffffff',
    border: 'rgba(24, 123, 43, .36)', shadow: 'rgba(24, 123, 43, .28)',
  },
  '948/920': {
    shortLabel: '948', primary: '#b8bdc6', secondary: '#69717e', text: '#ffffff',
    border: 'rgba(82, 91, 104, .36)', shadow: 'rgba(82, 91, 104, .27)',
  },
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function themeKey(name: string) {
  const normalized = normalize(name)
  if (/\b948\s*\/\s*920\b/.test(normalized)) return '948/920'
  if (/\b010\b/.test(normalized) || normalized.includes('BABY')) return '010'

  return Object.keys(themes).find(key => new RegExp(`(?:^|\\s)${key}(?:$|\\s)`).test(normalized))
}

function fallbackLabel(name: string) {
  const normalized = normalize(name).replace(/\bLUMINARIA\b|\bLUM\b/g, '').trim()
  const firstPart = normalized.split(/[\s/]+/).find(Boolean)
  return (firstPart || fallbackTheme.shortLabel).slice(0, 3)
}

export function getLuminaireTheme(name: string): LuminaireTheme {
  const key = themeKey(name)
  return key ? themes[key] : { ...fallbackTheme, shortLabel: fallbackLabel(name) }
}

export function getLuminaireThemeStyle(theme: LuminaireTheme): LuminaireThemeStyle {
  return {
    '--luminaire-primary': theme.primary,
    '--luminaire-secondary': theme.secondary,
    '--luminaire-text': theme.text,
    '--luminaire-border': theme.border,
    '--luminaire-shadow': theme.shadow,
  }
}
