import { Copy, Edit3, MapPin, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { InventoryLocation } from '../types/inventory'
import type { LuminaireCart } from '../types/cart'
import { MaterialVisual } from '../features/materials/MaterialVisual'
import { getMaterialDescription } from '../features/materials/materialCatalog'
import { findCartMemberships } from '../features/carts/cartLookup'
import { getLuminaireTheme } from '../features/carts/luminaireTheme'
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
  const known = items.filter(item => item.quantidade != null)
  const total = known.reduce((sum, item) => sum + (item.quantidade ?? 0), 0)

  return <section className="results">
    <div className="results-summary">
      <div><b>{items.length} {items.length === 1 ? 'localização encontrada' : 'localizações encontradas'}</b>{equivalent && <span className="badge">Correspondência equivalente AI4/AI6</span>}</div>
      {known.length > 0 && <span>Total conhecido: <b>{total}</b>{known.length < items.length ? ' (parcial)' : ''}</span>}
    </div>
    <div className="result-list">
      {items.map(item => {
        const description = getMaterialDescription(item.codigo, item.descritivo)
        return <article className="result-card" key={item.id}>
          <div className="result-card-content">
            <MaterialVisual code={item.codigo} description={description}/>
            <div className="result-main">
              <span className="code-line">{item.codigo}</span>
              <strong>{item.bombona}</strong>
              <div className="address"><MapPin size={16}/>{item.endereco}</div>
              {description && <p>{description}</p>}
              <small>Quantidade: {item.quantidade == null ? '—' : item.quantidade}</small>
              <LuminaireUsage code={item.codigo} carts={carts}/>
            </div>
          </div>
          <div className="result-actions">
            <button title="Copiar localização" onClick={() => onCopy(`${item.codigo} | ${item.bombona} | ${item.endereco}`)}><Copy size={17}/></button>
            {onEdit && <button title="Editar" onClick={() => onEdit(item)}><Edit3 size={17}/></button>}
            {onDelete && <button title="Excluir" onClick={() => onDelete(item)}><Trash2 size={17}/></button>}
          </div>
        </article>
      })}
    </div>
  </section>
}
