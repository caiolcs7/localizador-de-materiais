import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Archive,
  Calculator as CalculatorIcon,
  Camera,
  Database,
  Download,
  FileDown,
  Home,
  LogOut,
  Menu,
  PackagePlus,
  Search,
  ShoppingCart,
  Star,
  Upload,
  X,
} from 'lucide-react'
import {
  deleteLocation,
  fetchAllInventory,
  fetchInventoryForCodes,
  initializeInventory,
  searchInventory,
  subscribeToInventory,
  type InventoryRealtimeChange,
} from './services/inventoryService'
import { fetchCarts, subscribeToCarts } from './services/cartService'
import type { InventoryLocation, SearchResult } from './types/inventory'
import type { LuminaireCart } from './types/cart'
import { ItemModal } from './features/items/ItemModal'
import { ResultCards } from './components/ResultCards'
import { exportBackup, exportCSV, importBackup } from './features/backup/backup'
import { cleanScannedCode, formatBombona, normalizeSearch } from './utils/normalize'
import { MaterialVisual } from './features/materials/MaterialVisual'
import { getMaterialDescription } from './features/materials/materialCatalog'
import { buildItemStatusRows, type ItemsStatusFilter } from './features/items/itemStatus'
import { ThemeSwitch } from './features/theme/ThemeSwitch'
import { AdminUsersPanel } from './features/admin/AdminUsersPanel'
import { deduplicateRecentSearches, isCompleteSearch, loadRecentSearches, mergeRecentSearch } from './features/search/recentSearches'
import { StockFilter } from './features/inventory/StockFilter'
import { isVisibleWithStockFilter } from './features/inventory/stockVisibility'
import './styles.css'
import './brand.css'
import './navigation.css'

const recentKey = 'lm-recent:v2'
const legacyRecentKey = 'lm-recent'
const favoriteKey = 'lm-favorites'

const ScannerModal = lazy(() => import('./features/scanner/ScannerModal').then(module => ({ default: module.ScannerModal })))
const CartsPage = lazy(() => import('./features/carts/CartsPage').then(module => ({ default: module.CartsPage })))
const CalculatorPage = lazy(() => import('./features/calculator/CalculatorPage').then(module => ({ default: module.CalculatorPage })))

const loadList = (key: string) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

const saveList = (key: string, value: string[]) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { return }
}

const removeList = (key: string) => {
  try { localStorage.removeItem(key) } catch { return }
}

const loadInitialRecentSearches = () => {
  const current = loadRecentSearches(recentKey)
  return current.length ? current : loadRecentSearches(legacyRecentKey)
}

const logoSrc = `${import.meta.env.BASE_URL}maccomevap-logo.png`

function applyInventoryChange(records: InventoryLocation[], change: InventoryRealtimeChange) {
  if (change.eventType === 'DELETE') return records.filter(item => item.id !== change.id)
  const index = records.findIndex(item => item.id === change.record.id)
  if (index < 0) return [change.record, ...records]
  const next = [...records]
  next[index] = change.record
  return next
}

type AppProps = { adminMode?: boolean; adminEmail?: string; onLogout?: () => Promise<void> }

export default function App({ adminMode = false, adminEmail, onLogout }: AppProps) {
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult>({ kind: 'contains', items: [], hasMore: false })
  const [all, setAll] = useState<InventoryLocation[]>([])
  const [cartInventory, setCartInventory] = useState<InventoryLocation[]>([])
  const [inventoryTotal, setInventoryTotal] = useState(0)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryLoadError, setInventoryLoadError] = useState('')
  const [carts, setCarts] = useState<LuminaireCart[]>([])
  const [online, setOnline] = useState(true)
  const [scanner, setScanner] = useState(false)
  const [editor, setEditor] = useState<Partial<InventoryLocation> | null>(null)
  const [showItems, setShowItems] = useState(false)
  const [showData, setShowData] = useState(false)
  const [showCarts, setShowCarts] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [itemsStatus, setItemsStatus] = useState<ItemsStatusFilter>('all')
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [itemVisibleLimit, setItemVisibleLimit] = useState(80)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchRevision, setSearchRevision] = useState(0)
  const [recent, setRecent] = useState<string[]>(loadInitialRecentSearches)
  const [favorites, setFavorites] = useState<string[]>(() => loadList(favoriteKey))
  const [toast, setToast] = useState('')
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('lm-theme') === 'dark' } catch { return false }
  })
  const allLoadedRef = useRef(false)
  const inventoryLoadingRef = useRef(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deferredItemQuery = useDeferredValue(query)

  const cartCodes = useMemo(
    () => carts.flatMap(cart => cart.items.map(item => item.codigo)),
    [carts],
  )
  const cartCodeSet = useMemo(() => new Set(cartCodes.flatMap(rawCode => {
    const code = normalizeSearch(rawCode)
    const values = [code]
    if (code.endsWith('AI4')) values.push(`${code.slice(0, -1)}6`)
    if (code.endsWith('AI6')) values.push(`${code.slice(0, -1)}4`)
    return values
  })), [cartCodes])

  const notify = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(''), 1800)
  }, [])

  const refreshAllInventory = useCallback(async () => {
    if (inventoryLoadingRef.current) return
    inventoryLoadingRef.current = true
    setInventoryLoading(true)
    setInventoryLoadError('')
    try {
      const records = await fetchAllInventory()
      setAll(records)
      setInventoryTotal(records.length)
      allLoadedRef.current = true
    } catch (error) {
      setInventoryLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os materiais.')
    } finally {
      inventoryLoadingRef.current = false
      setInventoryLoading(false)
    }
  }, [])

  const refreshCartInventory = useCallback(async () => {
    if (!cartCodes.length) {
      setCartInventory([])
      return
    }
    setCartInventory(await fetchInventoryForCodes(cartCodes))
  }, [cartCodes])

  const refreshCarts = useCallback(async () => setCarts(await fetchCarts()), [])

  const refreshInventoryTotal = useCallback(async () => {
    const status = await initializeInventory()
    setOnline(status.online)
    setInventoryTotal(status.total)
  }, [])

  useEffect(() => {
    let active = true
    void Promise.allSettled([initializeInventory(), fetchCarts()]).then(([inventory, cartResult]) => {
      if (!active) return
      if (inventory.status === 'fulfilled') {
        setOnline(inventory.value.online)
        setInventoryTotal(inventory.value.total)
      }
      if (cartResult.status === 'fulfilled') setCarts(cartResult.value)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    return subscribeToInventory(change => {
      setSearchRevision(revision => revision + 1)
      if (allLoadedRef.current) setAll(records => applyInventoryChange(records, change))
      setCartInventory(records => applyInventoryChange(records, change).filter(item => cartCodeSet.has(item.codigoNormalizado)))
      setInventoryTotal(total => Math.max(0, total + (change.eventType === 'INSERT' ? 1 : change.eventType === 'DELETE' ? -1 : 0)))
    })
  }, [cartCodeSet])

  useEffect(() => subscribeToCarts(refreshCarts), [refreshCarts])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try { localStorage.setItem('lm-theme', dark ? 'dark' : 'light') } catch { return }
  }, [dark])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    setRecent(current => {
      const cleaned = deduplicateRecentSearches(current)
      saveList(recentKey, cleaned)
      removeList(legacyRecentKey)
      return JSON.stringify(current) === JSON.stringify(cleaned) ? current : cleaned
    })
  }, [ready])

  const homeVisible = !showItems && !showData && !showCarts && !showCalculator
  useEffect(() => {
    if (!ready || !homeVisible) return
    if (!query.trim()) {
      setResult({ kind: 'contains', items: [], hasMore: false })
      setSearching(false)
      return
    }
    const controller = new AbortController()
    let active = true
    setSearching(true)
    const timer = setTimeout(() => {
      void searchInventory(query, { onlyAvailable, signal: controller.signal }).then(nextResult => {
        if (!active) return
        setResult(nextResult)
        if (isCompleteSearch(nextResult)) {
          setRecent(previous => {
            const next = mergeRecentSearch(previous, query)
            saveList(recentKey, next)
            return next
          })
        }
      }).catch(error => {
        if (!controller.signal.aborted) console.error('Falha ao pesquisar materiais.', error)
      }).finally(() => {
        if (active) setSearching(false)
      })
    }, 250)
    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [homeVisible, onlyAvailable, query, ready, searchRevision])

  useEffect(() => {
    if (showItems && !allLoadedRef.current && !inventoryLoading && !inventoryLoadError) void refreshAllInventory()
  }, [inventoryLoadError, inventoryLoading, refreshAllInventory, showItems])

  const loadMoreSearchResults = async () => {
    if (loadingMore || !result.hasMore) return
    const searchedQuery = query
    setLoadingMore(true)
    try {
      const nextPage = await searchInventory(searchedQuery, {
        offset: result.items.length,
        onlyAvailable,
      })
      if (normalizeSearch(searchedQuery) !== normalizeSearch(query)) return
      setResult(current => {
        const ids = new Set(current.items.map(item => item.id))
        const appended = nextPage.items.filter(item => !ids.has(item.id))
        return { ...current, items: [...current.items, ...appended], hasMore: nextPage.hasMore }
      })
    } catch {
      notify('Não foi possível carregar mais resultados.')
    } finally {
      setLoadingMore(false)
    }
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    notify('Copiado')
  }

  const toggleFav = (value: string) => setFavorites(previous => {
    const next = previous.includes(value) ? previous.filter(item => item !== value) : [value, ...previous].slice(0, 12)
    saveList(favoriteKey, next)
    return next
  })

  const deleteItem = async (item: InventoryLocation) => {
    if (!confirm(`Excluir esta localização?\n\n${item.codigo}\n${item.bombona}\n${item.endereco}`)) return
    await deleteLocation(item.id)
    setAll(records => records.filter(record => record.id !== item.id))
    setResult(current => ({ ...current, items: current.items.filter(record => record.id !== item.id) }))
    notify('Localização excluída')
  }

  const itemRows = useMemo(() => buildItemStatusRows(all, carts), [all, carts])
  const itemCounts = useMemo(() => {
    const counts = { all: itemRows.length, located: 0, unlocated: 0, empty: 0 }
    for (const row of itemRows) counts[row.status] += 1
    return counts
  }, [itemRows])
  const filteredItemRows = useMemo(() => {
    const normalized = normalizeSearch(deferredItemQuery)
    const normalizedBombona = normalizeSearch(formatBombona(deferredItemQuery))
    return itemRows.filter(row => {
      if (itemsStatus !== 'all' && row.status !== itemsStatus) return false
      const description = getMaterialDescription(row.codigo, row.descritivo)
      if (onlyAvailable && !isVisibleWithStockFilter(row, description)) return false
      if (!normalized) return true
      return normalizeSearch(row.codigo).includes(normalized)
        || normalizeSearch(formatBombona(row.bombona)).includes(normalizedBombona)
        || normalizeSearch(row.endereco).includes(normalized)
        || normalizeSearch(row.descritivo ?? '').includes(normalized)
        || normalizeSearch(row.carts.join(' ')).includes(normalized)
    })
  }, [deferredItemQuery, itemRows, itemsStatus, onlyAvailable])
  const visibleItemRows = useMemo(
    () => filteredItemRows.slice(0, itemVisibleLimit),
    [filteredItemRows, itemVisibleLimit],
  )
  const filteredSearchItems = useMemo(() => onlyAvailable
    ? result.items.filter(item => isVisibleWithStockFilter(item, getMaterialDescription(item.codigo, item.descritivo)))
    : result.items, [onlyAvailable, result.items])

  useEffect(() => setItemVisibleLimit(80), [deferredItemQuery, itemsStatus, onlyAvailable])

  const openHome = () => {
    setShowCarts(false)
    setShowItems(false)
    setShowData(false)
    setShowCalculator(false)
    setMobileMenu(false)
  }
  const openItems = () => {
    setShowItems(true)
    setShowData(false)
    setShowCarts(false)
    setShowCalculator(false)
    setMobileMenu(false)
  }
  const openCarts = () => {
    setShowCarts(true)
    setShowItems(false)
    setShowData(false)
    setShowCalculator(false)
    setMobileMenu(false)
  }
  const openCalculator = () => {
    setShowCalculator(true)
    setShowItems(false)
    setShowData(false)
    setShowCarts(false)
    setMobileMenu(false)
  }
  const openData = () => {
    setShowData(true)
    setShowItems(false)
    setShowCarts(false)
    setShowCalculator(false)
    setMobileMenu(false)
  }
  const detect = (value: string) => {
    const cleaned = cleanScannedCode(value)
    setScanner(false)
    if (!cleaned) {
      notify('Leitura inválida')
      return
    }
    setQuery(cleaned)
    openHome()
    notify('Código lido')
  }
  const openHomeSearch = (code: string) => {
    openHome()
    setQuery(code)
    notify('Código enviado para o Localizador')
  }

  if (!ready) return <div className="loading">Preparando o Localizador…</div>

  return <div className="app-shell">
    <header>
      <button className="brand brand-button" onClick={openHome}><img className="brand-logo" src={logoSrc} alt="Maccomevap"/><div><b>Localizador de Materiais</b><span>Maccomevap · Almoxarifado</span></div></button>
      <nav className={`app-nav ${mobileMenu ? 'open' : ''}`} aria-label="Navegação principal">
        <button className={`nav-3d ${homeVisible ? 'active' : ''}`} onClick={openHome}><Home size={18}/>Início</button>
        <button className="nav-3d" onClick={() => { setScanner(true); setMobileMenu(false) }}><Camera size={18}/>Scanner</button>
        <button className="nav-3d" onClick={() => { setEditor({}); setMobileMenu(false) }}><PackagePlus size={18}/>Novo item</button>
        <button className={`nav-3d ${showItems ? 'active' : ''}`} onClick={openItems}><Archive size={18}/>Itens</button>
        <button className={`nav-3d ${showCarts ? 'active' : ''}`} onClick={openCarts}><ShoppingCart size={18}/>Carrinhos</button>
        <button className={`nav-3d ${showCalculator ? 'active' : ''}`} onClick={openCalculator}><CalculatorIcon size={18}/>Calculadora</button>
        {adminMode && <button className={`nav-3d ${showData ? 'active' : ''}`} onClick={openData}><Database size={18}/>Dados</button>}
        <div className="theme-nav-slot"><span className="theme-nav-label">Tema {dark ? 'escuro' : 'claro'}</span><ThemeSwitch dark={dark} onChange={setDark}/></div>
        {adminMode && onLogout && <button className="nav-3d" onClick={() => void onLogout()} title={adminEmail}><LogOut size={18}/>Sair</button>}
      </nav>
      <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X/> : <Menu/>}</button>
    </header>

    <main>
      {homeVisible && <>
        <section className="hero"><div className="eyebrow">LOCALIZAÇÃO RÁPIDA</div><h1>Onde está o material?</h1><p>Pesquise por código, descritivo, bombona ou endereço físico.</p><div className="search-wrap"><Search size={21}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar código, item, bombona ou endereço..."/><button className="scan-short" onClick={() => setScanner(true)}><Camera size={19}/><span>Escanear</span></button></div><StockFilter checked={onlyAvailable} onChange={setOnlyAvailable}/></section>
        {query.trim() && searching && <div className="search-progress" role="status">Buscando materiais…</div>}
        {query.trim() && !searching && filteredSearchItems.length > 0 && <ResultCards
          items={filteredSearchItems}
          carts={carts}
          equivalent={result.kind === 'equivalent'}
          hasMore={result.hasMore}
          loadingMore={loadingMore}
          resetKey={`${normalizeSearch(query)}:${onlyAvailable}`}
          onLoadMore={() => void loadMoreSearchResults()}
          onEdit={adminMode ? setEditor : undefined}
          onDelete={adminMode ? deleteItem : undefined}
          onCopy={copy}
        />}
        {query.trim() && !searching && result.items.length === 0 && <div className="empty-search"><b>Nenhum material encontrado</b><span>{query}</span>{result.suggestion && <button onClick={() => setQuery(result.suggestion!)}>Você quis dizer <b>{result.suggestion}</b>?</button>}<button className="primary-button" onClick={() => setEditor({ codigo: query })}>Cadastrar este código</button></div>}
        {!query.trim() && <section className="quick"><div><div className="section-head"><b>Recentes</b><button onClick={() => { setRecent([]); removeList(recentKey); removeList(legacyRecentKey) }}>Limpar</button></div><div className="chips">{recent.length ? recent.map(value => <button key={value} onClick={() => setQuery(value)}>{value}</button>) : <span>Nenhuma pesquisa recente.</span>}</div></div><div><div className="section-head"><b>Favoritos</b></div><div className="chips">{favorites.length ? favorites.map(value => <button key={value} onClick={() => setQuery(value)}><Star size={14}/>{value}</button>) : <span>Marque consultas frequentes nos resultados.</span>}</div></div></section>}
      </>}

      {showItems && inventoryLoading && <div className="loading inline-loading">Carregando a lista completa somente para esta tela…</div>}
      {showItems && inventoryLoadError && <div className="empty-search"><b>Não foi possível carregar os itens</b><span>{inventoryLoadError}</span><button className="primary-button" onClick={() => void refreshAllInventory()}>Tentar novamente</button></div>}
      {showItems && !inventoryLoading && !inventoryLoadError && <section className="page">
        <div className="page-title"><div><h2>Itens</h2><p>{all.length} localizações cadastradas · {itemCounts.unlocated} códigos sem endereço</p></div><div className="page-actions-wrap"><button className="secondary-button" onClick={openHome}><Home size={16}/>Voltar ao início</button><button className="primary-button" onClick={() => setEditor({})}><PackagePlus size={17}/>Novo item</button></div></div>
        <div className="items-status-filter" role="group" aria-label="Filtrar itens por situação">
          <button className={itemsStatus === 'all' ? 'active' : ''} onClick={() => setItemsStatus('all')}>Todos <span>{itemCounts.all}</span></button>
          <button className={itemsStatus === 'located' ? 'active' : ''} onClick={() => setItemsStatus('located')}>Código + endereço <span>{itemCounts.located}</span></button>
          <button className={itemsStatus === 'unlocated' ? 'active' : ''} onClick={() => setItemsStatus('unlocated')}>Código sem endereço <span>{itemCounts.unlocated}</span></button>
          <button className={itemsStatus === 'empty' ? 'active' : ''} onClick={() => setItemsStatus('empty')}>Endereço vazio <span>{itemCounts.empty}</span></button>
        </div>
        <StockFilter checked={onlyAvailable} onChange={setOnlyAvailable} compact/>
        <div className="table-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filtrar código, bombona, endereço, descritivo ou luminária"/></div>
        <div className="table-wrap"><table className="items-table"><thead><tr><th>Código</th><th>Bombona</th><th>Endereço</th><th>Status</th><th>Descritivo</th><th>Quantidade</th>{adminMode && <th>Ações</th>}</tr></thead><tbody>
          {visibleItemRows.map(row => {
            const description = getMaterialDescription(row.codigo, row.descritivo)
            return <tr key={row.key}><td><div className="item-code-cell"><MaterialVisual code={row.codigo} description={description} compact/><b>{row.codigo}</b></div></td><td>{row.bombona === 'N/T' ? '—' : row.bombona || '—'}</td><td>{row.endereco || '—'}</td><td><span className={`item-status-badge ${row.status}`}>{row.status === 'located' ? 'Código + endereço' : row.status === 'unlocated' ? 'Código sem endereço' : 'Endereço vazio'}</span></td><td><div className="item-description-cell"><span>{description || '—'}</span>{row.carts.length > 0 && <small>Carrinhos: {row.carts.join(' · ')}</small>}</div></td><td>{row.quantidade ?? '—'}</td>{adminMode && <td>{row.inventoryItem ? <button className="table-action" onClick={() => setEditor(row.inventoryItem!)}>{row.status === 'empty' ? 'Preencher' : 'Editar'}</button> : <button className="table-action" onClick={() => setEditor({ codigo: row.codigo, descritivo: description })}>Cadastrar endereço</button>}</td>}</tr>
          })}
          {filteredItemRows.length === 0 && <tr className="table-empty-row"><td colSpan={adminMode ? 7 : 6}>Nenhum item encontrado neste filtro.</td></tr>}
        </tbody></table></div>
        {visibleItemRows.length < filteredItemRows.length && <button className="load-more-button" onClick={() => setItemVisibleLimit(limit => limit + 80)}>Mostrar mais 80 <span>{filteredItemRows.length - visibleItemRows.length} restantes</span></button>}
      </section>}

      {showCarts && <Suspense fallback={<div className="loading inline-loading">Carregando carrinhos…</div>}><CartsPage inventory={cartInventory} carts={carts} isAdmin={adminMode} onOpenInventoryCode={openHomeSearch} onBackHome={openHome} onRefreshInventory={refreshCartInventory} onRefreshCarts={refreshCarts}/></Suspense>}
      {showCalculator && <Suspense fallback={<div className="loading inline-loading">Carregando calculadora…</div>}><CalculatorPage onBackHome={openHome} isAdmin={adminMode}/></Suspense>}
      {adminMode && showData && <section className="page"><div className="page-title"><div><h2>Dados e acessos</h2><p>Backup central do Supabase e contas administrativas.</p></div><button className="secondary-button" onClick={openHome}><Home size={16}/>Voltar ao início</button></div><div className="data-grid"><button onClick={() => void exportBackup()}><Download/><b>Exportar backup</b><span>Salva todos os materiais em JSON.</span></button><label><Upload/><b>Importar backup</b><span>Mescla materiais pelo ID, sem excluir os demais.</span><input type="file" accept="application/json" onChange={async event => { const file = event.target.files?.[0]; if (!file || !confirm('Mesclar os materiais deste backup com o banco atual? Nenhum registro será apagado.')) return; try { const count = await importBackup(file); if (allLoadedRef.current) await refreshAllInventory(); else await refreshInventoryTotal(); notify(`${count} registros importados`) } catch (error) { alert(error instanceof Error ? error.message : 'Backup inválido') } }}/></label><button onClick={() => void exportCSV()}><FileDown/><b>Exportar CSV</b><span>Arquivo compatível com Excel.</span></button></div><AdminUsersPanel/></section>}
    </main>

    <footer><span>{showCalculator ? 'Calculadora industrial · histórico neste dispositivo' : `${online ? 'Supabase sincronizado' : 'Cópia local offline'} · ${inventoryTotal} registros`}</span>{!showCalculator && <button onClick={() => toggleFav(query.trim().toUpperCase())} disabled={!query.trim()}><Star size={14}/> {favorites.includes(query.trim().toUpperCase()) ? 'Remover favorito' : 'Favoritar pesquisa'}</button>}</footer>
    {scanner && <Suspense fallback={<div className="modal-backdrop"><div className="scanner-modal">Carregando leitor…</div></div>}><ScannerModal onDetected={detect} onClose={() => setScanner(false)}/></Suspense>}
    {editor && <ItemModal initial={editor} allowDuplicateOverride={adminMode} onClose={() => setEditor(null)} onSaved={record => {
      if (allLoadedRef.current) setAll(records => applyInventoryChange(records, { eventType: editor.id ? 'UPDATE' : 'INSERT', record }))
      if (cartCodeSet.has(record.codigoNormalizado)) setCartInventory(records => applyInventoryChange(records, { eventType: editor.id ? 'UPDATE' : 'INSERT', record }))
      setResult(current => ({ ...current, items: current.items.some(item => item.id === record.id) ? current.items.map(item => item.id === record.id ? record : item) : current.items }))
      void refreshInventoryTotal()
      notify(editor.id ? 'Alterações salvas' : 'Item salvo')
    }}
    />}
    {toast && <div className="toast">{toast}</div>}
  </div>
}
