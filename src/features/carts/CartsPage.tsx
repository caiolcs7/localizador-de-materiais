import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Circle, Filter, ListChecks, MapPin, PackageSearch, Search, ShoppingCart, XCircle } from 'lucide-react'
import cartsSource from '../../data/cartsData.json'
import type { InventoryLocation } from '../../types/inventory'
import type { LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'
import { cartItemKey, categoryForItem, findInventoryLocations } from './cartUtils'

type Props = {
  inventory: InventoryLocation[]
  onOpenInventoryCode: (code: string) => void
}

type LocationFilter = 'all' | 'located' | 'unlocated'
const progressKey = 'lm-carts-progress-v1'

function loadProgress() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(progressKey) || '[]'))
  } catch {
    return new Set<string>()
  }
}

export function CartsPage({ inventory, onOpenInventoryCode }: Props) {
  const carts = cartsSource as LuminaireCart[]
  const [selectedId, setSelectedId] = useState(carts[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all')
  const [onlyPending, setOnlyPending] = useState(false)
  const [progress, setProgress] = useState<Set<string>>(() => loadProgress())

  useEffect(() => {
    localStorage.setItem(progressKey, JSON.stringify([...progress]))
  }, [progress])

  const selected = useMemo(() => carts.find(cart => cart.id === selectedId) ?? carts[0], [carts, selectedId])

  const enriched = useMemo(() => (selected?.items ?? []).map((item, index) => {
    const locations = findInventoryLocations(item.codigo, inventory)
    const exact = locations.some(location => normalizeSearch(location.codigo) === normalizeSearch(item.codigo))
    return {
      item,
      index,
      key: selected ? cartItemKey(selected.id, item, index) : String(index),
      category: categoryForItem(item),
      locations,
      equivalentOnly: locations.length > 0 && !exact
    }
  }), [selected, inventory])

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(enriched.map(row => row.category))).sort((a, b) => a.localeCompare(b, 'pt-BR'))], [enriched])

  useEffect(() => {
    if (!categories.includes(category)) setCategory('Todos')
  }, [categories, category])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    return enriched.filter(row => {
      if (category !== 'Todos' && row.category !== category) return false
      if (locationFilter === 'located' && row.locations.length === 0) return false
      if (locationFilter === 'unlocated' && row.locations.length > 0) return false
      if (onlyPending && progress.has(row.key)) return false
      if (!q) return true
      return normalizeSearch(`${row.item.codigo} ${row.item.descritivo ?? ''} ${row.category}`).includes(q)
    })
  }, [enriched, query, category, locationFilter, onlyPending, progress])

  const separated = enriched.filter(row => progress.has(row.key)).length
  const located = enriched.filter(row => row.locations.length > 0).length
  const percent = enriched.length ? Math.round((separated / enriched.length) * 100) : 0

  const toggleItem = (key: string) => setProgress(previous => {
    const next = new Set(previous)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const clearCurrent = () => {
    if (!selected || !confirm(`Reiniciar a separação do carrinho ${selected.nome}?`)) return
    const currentKeys = new Set(enriched.map(row => row.key))
    setProgress(previous => new Set([...previous].filter(key => !currentKeys.has(key))))
  }

  const markFiltered = () => setProgress(previous => {
    const next = new Set(previous)
    filtered.forEach(row => next.add(row.key))
    return next
  })

  if (!carts.length) {
    return <section className="page carts-page">
      <div className="page-title"><div><h2>Carrinhos</h2><p>Composição de materiais por luminária.</p></div></div>
      <div className="carts-empty">
        <ShoppingCart size={34}/>
        <b>Módulo de carrinhos preparado</b>
        <p>A estrutura está pronta para receber a planilha. Cada aba da planilha será preservada como uma luminária, sem inventar códigos, quantidades ou categorias.</p>
      </div>
    </section>
  }

  return <section className="page carts-page">
    <div className="page-title carts-title">
      <div><h2>Carrinhos</h2><p>Lista de separação e conferência por luminária.</p></div>
      <div className="cart-select-wrap">
        <span>Luminária</span>
        <select value={selected?.id ?? ''} onChange={event => { setSelectedId(event.target.value); setQuery(''); setCategory('Todos'); setLocationFilter('all') }}>
          {carts.map(cart => <option key={cart.id} value={cart.id}>{cart.nome}</option>)}
        </select>
      </div>
    </div>

    <div className="cart-kpis">
      <div><ShoppingCart/><span>Itens do carrinho</span><strong>{enriched.length}</strong></div>
      <div><MapPin/><span>Com localização</span><strong>{located}<small> / {enriched.length}</small></strong></div>
      <div><ListChecks/><span>Separação</span><strong>{separated}<small> / {enriched.length}</small></strong></div>
      <div className="progress-kpi"><CheckCircle2/><span>Progresso</span><strong>{percent}%</strong><div><i style={{ width: `${percent}%` }}/></div></div>
    </div>

    <div className="cart-toolbar">
      <div className="table-search cart-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar código ou descritivo no carrinho"/></div>
      <div className="cart-actions"><button className="secondary-button" onClick={markFiltered} disabled={!filtered.length}><Check size={16}/>Separar visíveis</button><button className="secondary-button" onClick={clearCurrent} disabled={!separated}>Reiniciar</button></div>
    </div>

    <div className="cart-filters">
      <div className="filter-label"><Filter size={15}/>Filtros</div>
      <div className="filter-chips">
        {categories.map(value => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>)}
      </div>
      <div className="filter-row">
        <button className={locationFilter === 'all' ? 'active' : ''} onClick={() => setLocationFilter('all')}>Todos</button>
        <button className={locationFilter === 'located' ? 'active' : ''} onClick={() => setLocationFilter('located')}>Com localização</button>
        <button className={locationFilter === 'unlocated' ? 'active warning' : ''} onClick={() => setLocationFilter('unlocated')}>Sem localização</button>
        <label className="pending-toggle"><input type="checkbox" checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)}/>Somente pendentes</label>
      </div>
    </div>

    <div className="cart-context">
      <div><b>{selected?.nome}</b><span>Aba de origem: {selected?.sourceSheet}</span></div>
      <span>{filtered.length} {filtered.length === 1 ? 'item exibido' : 'itens exibidos'}</span>
    </div>

    <div className="cart-list">
      {filtered.map(row => {
        const done = progress.has(row.key)
        const uniqueBombonas = Array.from(new Set(row.locations.map(location => location.bombona)))
        return <article className={`cart-item ${done ? 'done' : ''}`} key={row.key}>
          <button className="check-button" onClick={() => toggleItem(row.key)} aria-label={done ? 'Marcar como pendente' : 'Marcar como separado'}>{done ? <CheckCircle2/> : <Circle/>}</button>
          <div className="cart-item-main">
            <div className="cart-item-heading"><strong>{row.item.codigo}</strong><span className="category-badge">{row.category}</span>{row.equivalentOnly && <span className="equivalent-badge">AI4/AI6</span>}</div>
            <p>{row.item.descritivo || 'Sem descritivo informado'}</p>
            <div className="cart-item-meta">
              <span>Qtd.: <b>{row.item.quantidade ?? '—'}</b>{row.item.unidade ? ` ${row.item.unidade}` : ''}</span>
              {row.item.observacoes && <span>{row.item.observacoes}</span>}
            </div>
          </div>
          <div className="cart-location">
            {row.locations.length ? <>
              <span className="location-status ok"><PackageSearch size={14}/>Localizado</span>
              <div className="bombona-list">{uniqueBombonas.slice(0, 3).map(bombona => <span key={bombona}>{bombona}</span>)}{uniqueBombonas.length > 3 && <span>+{uniqueBombonas.length - 3}</span>}</div>
              <button onClick={() => onOpenInventoryCode(row.item.codigo)}>Ver no Localizador</button>
            </> : <>
              <span className="location-status missing"><XCircle size={14}/>Sem localização cadastrada</span>
              <small>Não foi encontrada bombona para este código na base atual.</small>
              <button onClick={() => onOpenInventoryCode(row.item.codigo)}>Pesquisar código</button>
            </>}
          </div>
        </article>
      })}
      {!filtered.length && <div className="cart-no-results"><b>Nenhum item neste filtro.</b><span>Altere a categoria, a pesquisa ou o status de localização.</span></div>}
    </div>
  </section>
}
