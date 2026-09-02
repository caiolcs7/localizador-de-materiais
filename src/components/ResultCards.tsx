import { Copy, Edit3, MapPin, Trash2 } from 'lucide-react'
import type { InventoryLocation } from '../types/inventory'
import { MaterialVisual } from '../features/materials/MaterialVisual'
import { getMaterialDescription } from '../features/materials/materialCatalog'

export function ResultCards({ items, equivalent, onEdit, onDelete, onCopy }: { items: InventoryLocation[]; equivalent?: boolean; onEdit:(x:InventoryLocation)=>void; onDelete:(x:InventoryLocation)=>void; onCopy:(s:string)=>void }) {
  const known = items.filter(x => x.quantidade != null)
  const total = known.reduce((s,x)=>s+(x.quantidade ?? 0),0)
  return <section className="results"><div className="results-summary"><div><b>{items.length} {items.length===1?'localização encontrada':'localizações encontradas'}</b>{equivalent && <span className="badge">Correspondência equivalente AI4/AI6</span>}</div>{known.length>0 && <span>Total conhecido: <b>{total}</b>{known.length<items.length?' (parcial)':''}</span>}</div>
    <div className="result-list">{items.map(item => {const description=getMaterialDescription(item.codigo,item.descritivo);return <article className="result-card" key={item.id}>
      <div className="result-card-content"><MaterialVisual code={item.codigo} description={description}/><div className="result-main"><span className="code-line">{item.codigo}</span><strong>{item.bombona}</strong><div className="address"><MapPin size={16}/>{item.endereco}</div>{description && <p>{description}</p>}<small>Quantidade: {item.quantidade == null ? '—' : item.quantidade}</small></div></div>
      <div className="result-actions"><button title="Copiar localização" onClick={()=>onCopy(`${item.codigo} | ${item.bombona} | ${item.endereco}`)}><Copy size={17}/></button><button title="Editar" onClick={()=>onEdit(item)}><Edit3 size={17}/></button><button title="Excluir" onClick={()=>onDelete(item)}><Trash2 size={17}/></button></div>
    </article>})}</div>
  </section>
}
