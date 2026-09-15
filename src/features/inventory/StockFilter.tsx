import './stock-filter.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  compact?: boolean
}

export function StockFilter({ checked, onChange, compact = false }: Props) {
  return <label className={`stock-filter${compact ? ' stock-filter--compact' : ''}`}>
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/>
    <span className="stock-filter-toggle" aria-hidden="true"><span/></span>
    <span className="stock-filter-copy">
      <b>Somente com estoque</b>
      {!compact && <small>Parafusos, porcas, arruelas e terminais com bombona continuam visíveis.</small>}
    </span>
  </label>
}
