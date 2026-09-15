import { Copy, Edit3, MapPin, Trash2 } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import type { InventoryLocation } from '../types/inventory'
import type { LuminaireCart } from '../types/cart'
import { MaterialVisual } from '../features/materials/MaterialVisual'
import { getMaterialDescription } from '../features/materials/materialCatalog'
import { findCartMemberships } from '../features/carts/cartLookup'
import { getLuminaireTheme } from '../features/carts/luminaireTheme'
import { hasVerifiedBombona } from '../features/inventory/stockVisibility'
import { normalizeSearch } from '../utils/normalize'
import './result-cards.css'

type Props = {
  items: InventoryLocation[]
  carts: LuminaireCart[]
  equivalent?: boolean
  onEdit?: (item: InventoryLocation) => void
  onDelete?: (item: InventoryLocation) => void
  onCopy: (value: string) => void
}

function LuminaireUsage({ code, carts }: { code: string; carts: LuminaireCart[] }) {
  // A associação é deliberadamente feita apenas pelo código. Bombona e endereço
  // não participam da consulta, portanto o mesmo código em vários endereços
  // sempre exibe exatamente o mesmo conjunto de luminárias.
  const memberships = findCartMemberships(code, carts).filter(item => item.match === 'exact')
  if (!memberships.length) return null

  return <div className="result-luminaires" aria-label={`Luminárias que utilizam o código ${code}`}>
    <span className="result-luminaires-label">Luminárias</span>
    <div className="result-luminaires-list">
      {memberships.map(membership => {
        const theme = getLuminaireTheme(membership.cartName)
        const swatchStyle: CSSProperties = {
          background: theme.split
            ? `linear-gradient(135deg, ${theme.primary} 0 48%, ${theme.secondary} 52% 100%)`
            : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          borderColor: theme.border,
          boxShadow: `0 1px 4px ${theme.shadow}`,
        }
        return <span className="result-luminaire-chip" key={membership.cartId} title={`${membership.cartName} · ${membership.sourceSheet}`}>
          <span className="result-luminaire-swatch" style={swatchStyle}/>
          <span>{membership.cartName}</span>
        </span>
      })}
    </div>
  </div>
}

export function ResultCards({ items, carts, equivalent, onEdit, onDelete, onCopy }: Props) {
  const [visibleCount, setVisibleCount] = useState(60)
  useEffect(() => setVisibleCount(60), [items])
  const visibleItems = items.slice(0, visibleCount)
  const knownByCode = new Map<string, number>()
  const codeCount = new Set(items.map(item => normalizeSearch(item.codigo))).size
  for (const item of items) {
    const code = normalizeSearch(item.codigo)
    if (item.quantidade != null && !knownByCode.has(code)) knownByCode.set(code, item.quantidade)
  }
  const total = [...knownByCode.values()].reduce((sum, quantity) => sum + quantity, 0)

  return <section className="results">
    <div className="results-summary">
      <div><b>{items.length} {items.length === 1 ? 'localização encontrada' : 'localizações encontradas'}</b>{equivalent && <span className="badge">Correspondência equivalente AI4/AI6</span>}</div>
      {knownByCode.size > 0 && <span>Saldo dos códigos: <b>{total}</b>{knownByCode.size < codeCount ? ' (parcial)' : ''}</span>}
    </div>
    <div className="result-list">
      {visibleItems.map(item => {
        const description = getMaterialDescription(item.codigo, item.descritivo)
        const hasBombona = hasVerifiedBombona(item.bombona)
        const copyValue = hasBombona ? `${item.codigo} | ${item.bombona} | ${item.endereco}` : `${item.codigo} | ${item.endereco}`
        return <article className="result-card" key={item.id}>
          <div className="result-card-content">
            <MaterialVisual code={item.codigo} description={description}/>
            <div className="result-main">
              <span className="code-line">{item.codigo}</span>
              {hasBombona ? <strong>{item.bombona}</strong> : <span className="result-location-label">Endereço de estoque</span>}
              <div className="address"><MapPin size={16}/>{item.endereco}</div>
              {description && <p>{description}</p>}
              <small>Quantidade: {item.quantidade == null ? '—' : item.quantidade}</small>
              <LuminaireUsage code={item.codigo} carts={carts}/>
            </div>
          </div>
          <div className="result-actions">
            <button title="Copiar localização" onClick={() => onCopy(copyValue)}><Copy size={17}/></button>
            {onEdit && <button title="Editar" onClick={() => onEdit(item)}><Edit3 size={17}/></button>}
            {onDelete && <button title="Excluir" onClick={() => onDelete(item)}><Trash2 size={17}/></button>}
          </div>
        </article>
      })}
    </div>
    {visibleItems.length<items.length&&<button className="load-more-button" onClick={()=>setVisibleCount(count=>count+60)}>Mostrar mais 60 <span>{items.length-visibleItems.length} restantes</span></button>}
  </section>
}
