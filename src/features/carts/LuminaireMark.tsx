import { getLuminaireTheme, getLuminaireThemeStyle } from './luminaireTheme'

type Props = {
  name: string
  compact?: boolean
}

export function LuminaireMark({ name, compact = false }: Props) {
  const theme = getLuminaireTheme(name)

  return (
    <span
      className={`luminaire-mark${compact ? ' luminaire-mark--compact' : ''}${theme.split ? ' luminaire-mark--split' : ''}`}
      style={getLuminaireThemeStyle(theme)}
      aria-hidden="true"
    >
      <span className="luminaire-mark__shine" />
      <span className="luminaire-mark__label">{theme.shortLabel}</span>
    </span>
  )
}
