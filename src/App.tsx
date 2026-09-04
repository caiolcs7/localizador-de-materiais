import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Calculator as CalculatorIcon, Camera, Database, Download, FileDown, Home, LogOut, Menu, PackagePlus, Search, ShoppingCart, Star, Upload, X } from 'lucide-react'
import { deleteLocation, getAllLocations, initializeInventory, searchInventory, subscribeToInventory } from './services/inventoryService'
import { fetchCarts, subscribeToCarts } from './services/cartService'
import type { InventoryLocation, SearchResult } from './types/inventory'
import type { LuminaireCart } from './types/cart'
import { ScannerModal } from './features/scanner/ScannerModal'
import { ItemModal } from './features/items/ItemModal'
import { CartsPage } from './features/carts/CartsPage'
import { ResultCards } from './components/ResultCards'
import { exportBackup, exportCSV, importBackup } from './features/backup/backup'
import { cleanScannedCode, formatBombona, normalizeSearch } from './utils/normalize'
import { MaterialVisual } from './features/materials/MaterialVisual'
import { getMaterialDescription } from './features/materials/materialCatalog'
import { buildItemStatusRows, type ItemsStatusFilter } from './features/items/itemStatus'
import { ThemeSwitch } from './features/theme/ThemeSwitch'
import { AdminUsersPanel } from './features/admin/AdminUsersPanel'
import { addRecentSearch, loadRecentSearches } from './features/search/recentSearches'
import './styles.css'
import './brand.css'
import './navigation.css'

const recentKey='lm-recent'; const favoriteKey='lm-favorites'
const loadList=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'[]') as string[]}catch{return []}}
const logoSrc=`${import.meta.env.BASE_URL}maccomevap-logo.png`
const CalculatorPage=lazy(()=>import('./features/calculator/CalculatorPage').then(module=>({default:module.CalculatorPage})))

type AppProps = { adminMode?: boolean; adminEmail?: string; onLogout?: () => Promise<void> }

export default function App({ adminMode=false, adminEmail, onLogout }: AppProps) {
  const [ready,setReady]=useState(false); const [query,setQuery]=useState(''); const [result,setResult]=useState<SearchResult>({kind:'contains',items:[]}); const [all,setAll]=useState<InventoryLocation[]>([])
  const [carts,setCarts]=useState<LuminaireCart[]>([]); const [online,setOnline]=useState(true)
  const [scanner,setScanner]=useState(false); const [editor,setEditor]=useState<Partial<InventoryLocation>|null>(null); const [showItems,setShowItems]=useState(false); const [showData,setShowData]=useState(false); const [showCarts,setShowCarts]=useState(false); const [showCalculator,setShowCalculator]=useState(false); const [mobileMenu,setMobileMenu]=useState(false)
  const [itemsStatus,setItemsStatus]=useState<ItemsStatusFilter>('all')
  const [recent,setRecent]=useState<string[]>(()=>loadRecentSearches(recentKey)); const [favorites,setFavorites]=useState<string[]>(()=>loadList(favoriteKey)); const [toast,setToast]=useState(''); const [dark,setDark]=useState(()=>localStorage.getItem('lm-theme')==='dark')
  const refresh=useCallback(async()=>setAll(await getAllLocations()),[])
  const refreshCarts=useCallback(async()=>setCarts(await fetchCarts()),[])
  useEffect(()=>{let active=true;void Promise.allSettled([initializeInventory().then(status=>setOnline(status.online)),refreshCarts()]).then(async()=>{await refresh();if(active)setReady(true)});return()=>{active=false}},[refresh,refreshCarts])
  useEffect(()=>subscribeToInventory(refresh),[refresh])
  useEffect(()=>subscribeToCarts(refreshCarts),[refreshCarts])
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('lm-theme',dark?'dark':'light')},[dark])
  useEffect(()=>{localStorage.setItem(recentKey,JSON.stringify(recent))},[recent])
  useEffect(()=>{if(!ready){return}; const id=setTimeout(async()=>{const r=await searchInventory(query);setResult(r);if(query.trim())setRecent(prev=>addRecentSearch(prev,query,r))},120);return()=>clearTimeout(id)},[query,ready])
  const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),1800)}
  const copy=async(s:string)=>{await navigator.clipboard.writeText(s);notify('Copiado')}
  const toggleFav=(s:string)=>setFavorites(prev=>{const n=prev.includes(s)?prev.filter(x=>x!==s):[s,...prev].slice(0,12);localStorage.setItem(favoriteKey,JSON.stringify(n));return n})
  const deleteItem=async(item:InventoryLocation)=>{if(confirm(`Excluir esta localização?\n\n${item.codigo}\n${item.bombona}\n${item.endereco}`)){await deleteLocation(item.id);await refresh();setResult(await searchInventory(query));notify('Localização excluída')}}

  const itemRows=useMemo(()=>buildItemStatusRows(all,carts),[all,carts])
  const itemCounts=useMemo(()=>({
    all:itemRows.length,
    located:itemRows.filter(row=>row.status==='located').length,
    unlocated:itemRows.filter(row=>row.status==='unlocated').length,
    empty:itemRows.filter(row=>row.status==='empty').length,
  }),[itemRows])
  const filteredItemRows=useMemo(()=>{
    const q=normalizeSearch(query)
    const bq=normalizeSearch(formatBombona(query))
    return itemRows.filter(row=>{
      if(itemsStatus!=='all'&&row.status!==itemsStatus)return false
      if(!q)return true
      return normalizeSearch(row.codigo).includes(q)
        || normalizeSearch(formatBombona(row.bombona)).includes(bq)
        || normalizeSearch(row.endereco).includes(q)
        || normalizeSearch(row.descritivo??'').includes(q)
        || normalizeSearch(row.carts.join(' ')).includes(q)
    })
  },[itemRows,itemsStatus,query])

  const openHome=()=>{setShowCarts(false);setShowItems(false);setShowData(false);setShowCalculator(false);setMobileMenu(false)}
  const detect=(value:string)=>{const cleaned=cleanScannedCode(value);setScanner(false);if(!cleaned){notify('Leitura inválida');return}setQuery(cleaned);openHome();notify('Código lido')}
  const openHomeSearch=(code:string)=>{openHome();setQuery(code);notify('Código enviado para o Localizador')}
  if(!ready) return <div className="loading">Sincronizando materiais…</div>
  return <div className="app-shell">
    <header><button className="brand brand-button" onClick={openHome}><img className="brand-logo" src={logoSrc} alt="Maccomevap"/><div><b>Localizador de Materiais</b><span>Maccomevap · Almoxarifado</span></div></button><nav className={`app-nav ${mobileMenu?'open':''}`} aria-label="Navegação principal">
      <button className={`nav-3d ${!showItems&&!showData&&!showCarts&&!showCalculator?'active':''}`} onClick={openHome}><Home size={18}/>Início</button><button className="nav-3d" onClick={()=>{setScanner(true);setMobileMenu(false)}}><Camera size={18}/>Scanner</button><button className="nav-3d" onClick={()=>{setEditor({});setMobileMenu(false)}}><PackagePlus size={18}/>Novo item</button><button className={`nav-3d ${showItems?'active':''}`} onClick={()=>{setShowItems(true);setShowData(false);setShowCarts(false);setShowCalculator(false);setMobileMenu(false)}}><Archive size={18}/>Itens</button><button className={`nav-3d ${showCarts?'active':''}`} onClick={()=>{setShowCarts(true);setShowItems(false);setShowData(false);setShowCalculator(false);setMobileMenu(false)}}><ShoppingCart size={18}/>Carrinhos</button><button className={`nav-3d ${showCalculator?'active':''}`} onClick={()=>{setShowCalculator(true);setShowItems(false);setShowData(false);setShowCarts(false);setMobileMenu(false)}}><CalculatorIcon size={18}/>Calculadora</button>{adminMode&&<button className={`nav-3d ${showData?'active':''}`} onClick={()=>{setShowData(true);setShowItems(false);setShowCarts(false);setShowCalculator(false);setMobileMenu(false)}}><Database size={18}/>Dados</button>}<div className="theme-nav-slot"><span className="theme-nav-label">Tema {dark?'escuro':'claro'}</span><ThemeSwitch dark={dark} onChange={setDark}/></div>{adminMode&&onLogout&&<button className="nav-3d" onClick={()=>void onLogout()} title={adminEmail}><LogOut size={18}/>Sair</button>}
    </nav><button className="menu-button" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button></header>
    <main>
      {!showItems&&!showData&&!showCarts&&!showCalculator && <><section className="hero"><div className="eyebrow">LOCALIZAÇÃO RÁPIDA</div><h1>Onde está o material?</h1><p>Pesquise por código, bombona ou endereço físico.</p><div className="search-wrap"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar código, bombona ou endereço..."/><button className="scan-short" onClick={()=>setScanner(true)}><Camera size={19}/><span>Escanear</span></button></div></section>
      {query.trim() && result.items.length>0 && <ResultCards items={result.items} carts={carts} equivalent={result.kind==='equivalent'} onEdit={adminMode?setEditor:undefined} onDelete={adminMode?deleteItem:undefined} onCopy={copy}/>}
      {query.trim() && result.items.length===0 && <div className="empty-search"><b>Código não encontrado</b><span>{query}</span>{result.suggestion&&<button onClick={()=>setQuery(result.suggestion!)}>Você quis dizer <b>{result.suggestion}</b>?</button>}<button className="primary-button" onClick={()=>setEditor({codigo:query})}>Cadastrar este código</button></div>}
      {!query.trim() && <section className="quick"><div><div className="section-head"><b>Recentes</b><button onClick={()=>{setRecent([]);localStorage.removeItem(recentKey)}}>Limpar</button></div><div className="chips">{recent.length?recent.map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>):<span>Nenhuma pesquisa recente.</span>}</div></div><div><div className="section-head"><b>Favoritos</b></div><div className="chips">{favorites.length?favorites.map(x=><button key={x} onClick={()=>setQuery(x)}><Star size={14}/>{x}</button>):<span>Marque consultas frequentes nos resultados.</span>}</div></div></section>}</>}
      {showItems && <section className="page"><div className="page-title"><div><h2>Itens</h2><p>{all.length} localizações cadastradas · {itemCounts.unlocated} códigos sem endereço</p></div><div className="page-actions-wrap"><button className="secondary-button" onClick={openHome}><Home size={16}/>Voltar ao início</button><button className="primary-button" onClick={()=>setEditor({})}><PackagePlus size={17}/>Novo item</button></div></div>
        <div className="items-status-filter" role="group" aria-label="Filtrar itens por situação">
          <button className={itemsStatus==='all'?'active':''} onClick={()=>setItemsStatus('all')}>Todos <span>{itemCounts.all}</span></button>
          <button className={itemsStatus==='located'?'active':''} onClick={()=>setItemsStatus('located')}>Código + endereço <span>{itemCounts.located}</span></button>
          <button className={itemsStatus==='unlocated'?'active':''} onClick={()=>setItemsStatus('unlocated')}>Código sem endereço <span>{itemCounts.unlocated}</span></button>
          <button className={itemsStatus==='empty'?'active':''} onClick={()=>setItemsStatus('empty')}>Endereço vazio <span>{itemCounts.empty}</span></button>
        </div>
        <div className="table-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar código, bombona, endereço, descritivo ou luminária"/></div>
        <div className="table-wrap"><table className="items-table"><thead><tr><th>Código</th><th>Bombona</th><th>Endereço</th><th>Status</th><th>Descritivo</th><th>Quantidade</th>{adminMode&&<th>Ações</th>}</tr></thead><tbody>{filteredItemRows.map(row=>{const description=getMaterialDescription(row.codigo,row.descritivo);return <tr key={row.key}><td><div className="item-code-cell"><MaterialVisual code={row.codigo} description={description} compact/><b>{row.codigo}</b></div></td><td>{row.bombona||'—'}</td><td>{row.endereco||'—'}</td><td><span className={`item-status-badge ${row.status}`}>{row.status==='located'?'Código + endereço':row.status==='unlocated'?'Código sem endereço':'Endereço vazio'}</span></td><td><div className="item-description-cell"><span>{description||'—'}</span>{row.carts.length>0&&<small>Carrinhos: {row.carts.join(' · ')}</small>}</div></td><td>{row.quantidade??'—'}</td>{adminMode&&<td>{row.inventoryItem?<button className="table-action" onClick={()=>setEditor(row.inventoryItem!)}>{row.status==='empty'?'Preencher':'Editar'}</button>:<button className="table-action" onClick={()=>setEditor({codigo:row.codigo,descritivo:description})}>Cadastrar endereço</button>}</td>}</tr>})}{filteredItemRows.length===0&&<tr className="table-empty-row"><td colSpan={adminMode?7:6}>Nenhum item encontrado neste filtro.</td></tr>}</tbody></table></div>
      </section>}
      {showCarts && <CartsPage inventory={all} carts={carts} isAdmin={adminMode} onOpenInventoryCode={openHomeSearch} onBackHome={openHome} onRefreshInventory={refresh} onRefreshCarts={refreshCarts}/>}
      {showCalculator && <Suspense fallback={<div className="loading">Carregando calculadora…</div>}><CalculatorPage onBackHome={openHome} isAdmin={adminMode}/></Suspense>}
      {adminMode&&showData && <section className="page"><div className="page-title"><div><h2>Dados e acessos</h2><p>Backup central do Supabase e contas administrativas.</p></div><button className="secondary-button" onClick={openHome}><Home size={16}/>Voltar ao início</button></div><div className="data-grid"><button onClick={exportBackup}><Download/><b>Exportar backup</b><span>Salva todos os materiais em JSON.</span></button><label><Upload/><b>Importar backup</b><span>Mescla materiais pelo ID, sem excluir os demais.</span><input type="file" accept="application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(!confirm('Mesclar os materiais deste backup com o banco atual? Nenhum registro será apagado.'))return;try{const n=await importBackup(f);await refresh();notify(`${n} registros importados`)}catch(err){alert(err instanceof Error?err.message:'Backup inválido')}}}/></label><button onClick={exportCSV}><FileDown/><b>Exportar CSV</b><span>Arquivo compatível com Excel.</span></button></div><AdminUsersPanel/></section>}
    </main>
    <footer><span>{showCalculator?'Calculadora industrial · histórico neste dispositivo':`${online?'Supabase sincronizado':'Cópia local offline'} · ${all.length} registros`}</span>{!showCalculator&&<button onClick={()=>toggleFav(query.trim().toUpperCase())} disabled={!query.trim()}><Star size={14}/> {favorites.includes(query.trim().toUpperCase())?'Remover favorito':'Favoritar pesquisa'}</button>}</footer>
    {scanner&&<ScannerModal onDetected={detect} onClose={()=>setScanner(false)}/>} {editor&&<ItemModal initial={editor} allowDuplicateOverride={adminMode} onClose={()=>setEditor(null)} onSaved={async()=>{await refresh();if(query)setResult(await searchInventory(query));notify(editor.id?'Alterações salvas':'Item salvo')}}/>} {toast&&<div className="toast">{toast}</div>}
  </div>
}
