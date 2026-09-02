import { describe, expect, it } from 'vitest'
import { getLuminaireTheme } from './luminaireTheme'

describe('getLuminaireTheme', () => {
  it.each([
    ['Luminária 254', '254'],
    ['Luminária AVF', 'AVF'],
    ['Lum 014', '014'],
    ['010 / Baby / Mini Baby', '010'],
    ['Luminária ERJ', 'ERJ'],
    ['Lum Ghb', 'GHB'],
    ['LUM ERV', 'ERV'],
    ['Luminária 984', '984'],
    ['Luminária CAS', 'CAS'],
    ['Luminária 035', '035'],
    ['Luminária MAS', 'MAS'],
    ['Luminária L75', 'L75'],
    ['Luminária 948/920', '948'],
    ['016/017', '016'],
  ])('maps %s to its visual identity', (name, shortLabel) => {
    expect(getLuminaireTheme(name).shortLabel).toBe(shortLabel)
  })

  it('keeps AVF orange and blue, and 010 orange and red', () => {
    expect(getLuminaireTheme('Luminária AVF')).toMatchObject({
      primary: '#ff8a24', secondary: '#1264d7', split: true,
    })
    expect(getLuminaireTheme('010 / Baby / Mini Baby')).toMatchObject({
      primary: '#ff8a24', secondary: '#d62828', split: true,
    })
  })

  it('uses the orange and yellow identity for 016/017', () => {
    expect(getLuminaireTheme('Luminária 016/017')).toMatchObject({
      primary: '#ff8a24', secondary: '#ffd43b', split: true,
    })
  })

  it('keeps GHB in the requested light-blue identity', () => {
    expect(getLuminaireTheme('Luminária GHB')).toMatchObject({
      shortLabel: 'GHB', primary: '#9fe2ff', secondary: '#42b9ee', text: '#07384f',
    })
  })

  it('creates a stable neutral label for a custom cart', () => {
    const theme = getLuminaireTheme('Luminária XYZ')
    expect(theme.shortLabel).toBe('XYZ')
    expect(theme.primary).toBe('#29313d')
  })
})
