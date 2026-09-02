import './theme-switch.css'

type Props = {
  dark: boolean
  onChange: (dark: boolean) => void
}

export function ThemeSwitch({ dark, onChange }: Props) {
  const nextTheme = dark ? 'claro' : 'escuro'

  return <label className="theme-switch" title={`Ativar modo ${nextTheme}`}>
    <span className="theme-switch__sr-only">Ativar modo {nextTheme}</span>
    <input
      type="checkbox"
      checked={dark}
      onChange={event => onChange(event.target.checked)}
      aria-label={`Ativar modo ${nextTheme}`}
    />
    <span className="theme-switch__slider" aria-hidden="true">
      <span className="theme-switch__star theme-switch__star--1"/>
      <span className="theme-switch__star theme-switch__star--2"/>
      <span className="theme-switch__star theme-switch__star--3"/>
      <span className="theme-switch__cloud"/>
    </span>
  </label>
}
