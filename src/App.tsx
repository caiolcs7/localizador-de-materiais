import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Camera, Database, Download, FileDown, Menu, Moon, PackagePlus, Search, ShoppingCart, Star, Sun, Upload, X } from 'lucide-react'
import { db, ensureSeeded } from './db/database'
import { deleteLocation, getAllLocations, searchInventory } from './services/inventoryService'
import type { InventoryLocation, SearchResult } from './types/inventory'
import { ScannerModal } from './features/scanner/ScannerModal'
import { ItemModal } from './features/items/ItemModal'
import { CartsPage } from './features/carts/CartsPage'
import { ResultCards } from './components/ResultCards'
import { exportBackup, exportCSV, importBackup } from './features/backup/backup'
import { cleanScannedCode, formatBombona, normalizeSearch } from './utils/normalize'
import './styles.css'

const recentKey='lm-recent'; const favoriteKey='lm-favorites'
const loadList=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'[]') as string[]}catch{return []}}

export default function App() {
  const [ready,setReady]=useState(false); const [query,setQuery]=useState(''); const [result,setResult]=useState<SearchResult>({kind:'contains',items:[]}); const [all,setAll]=useState<InventoryLocation[]>([])
  const [scanner,setScanner]=useState(false); const [editor,setEditor]=useState<Partial<InventoryLocation>|null>(null); const [showItems,setShowItems]=useState(false); const [showData,setShowData]=useState(false); const [showCarts,setShowCarts]=useState(false); const [mobileMenu,setMobileMenu]=useState(false)
  const [recent,setRecent]=useState<string[]>(()=>loadList(recentKey)); const [favorites,setFavorites]=useState<string[]>(()=>loadList(favoriteKey)); const [toast,setToast]=useState(''); const [dark,setDark]=useState(()=>localStorage.getItem('lm-theme')==='dark')
  const refresh=useCallback(async()=>setAll(await getAllLocations()),[])
  useEffect(()=>{ensureSeeded().then(async()=>{await refresh();setReady(true)})},[refresh])
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('lm-theme',dark?'dark':'light')},[dark])
  useEffect(()=>{if(!ready){return}; const id=setTimeout(async()=>{const r=await searchInventory(query);setResult(r);if(query.trim() && (r.items.length || r.suggestion)){setRecent(prev=>{const n=[query.trim().toUpperCase(),...prev.filter(x=>x!==query.trim().toUpperCase())].slice(0,10);localStorage.setItem(recentKey,JSON.stringify(n));return n})}},120);return()=>clearTimeout(id)},[query,ready])
  const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),1800)}
  const copy=async(s:string)=>{await navigator.clipboard.writeText(s);notify('Copiado')}
  const toggleFav=(s:string)=>setFavorites(prev=>{const n=prev.includes(s)?prev.filter(x=>x!==s):[s,...prev].slice(0,12);localStorage.setItem(favoriteKey,JSON.stringify(n));return n})
  const deleteItem=async(item:InventoryLocation)=>{if(confirm(`Excluir esta localização?\n\n${item.codigo}\n${item.bombona}\n${item.endereco}`)){await deleteLocation(item.id);await refresh();setResult(await searchInventory(query));notify('Localização excluída')}}
  const filtered=useMemo(()=>{const q=normalizeSearch(query); const bq=normalizeSearch(formatBombona(query)); return all.filter(x=>!q||normalizeSearch(x.codigo).includes(q)||normalizeSearch(formatBombona(x.bombona)).includes(bq)||normalizeSearch(x.endereco).includes(q)).sort((a,b)=>a.codigo.localeCompare(b.codigo))},[all,query])
  const detect=(value:string)=>{const cleaned=cleanScannedCode(value);setScanner(false);if(!cleaned){notify('Leitura inválida');return}setQuery(cleaned);notify('Código lido')}
  const openHomeSearch=(code:string)=>{setShowCarts(false);setShowItems(false);setShowData(false);setQuery(code)}
  if(!ready) return <div className="loading">Carregando base local…</div>
  return <div className="app-shell">
    <header><div className="brand"><div className="brand-mark">LM</div><div><b>Localizador de Materiais</b><span>Almoxarifado</span></div></div><nav className={mobileMenu?'open':''}>
      <button onClick={()=>{setScanner(true);setMobileMenu(false)}}><Camera size={18}/>Scanner</button><button onClick={()=>{setEditor({});setMobileMenu(false)}}><PackagePlus size={18}/>Novo item</button><button onClick={()=>{setShowItems(true);setShowData(false);setShowCarts(false);setMobileMenu(false)}}><Archive size={18}/>Itens</button><button onClick={()=>{setShowCarts(true);setShowItems(false);setShowData(false);setMobileMenu(false)}}><ShoppingCart size={18}/>Carrinhos</button><button onClick={()=>{setShowData(true);setShowItems(false);setShowCarts(false);setMobileMenu(false)}}><Database size={18}/>Dados</button><button className="icon-button" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
    </nav><button className="menu-button" onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button></header>
    <main>
      {!showItems&&!showData&&!showCarts && <><section className="hero"><div className="eyebrow">LOCALIZAÇÃO RÁPIDA</div><h1>Onde está o material?</h1><p>Pesquise por código, bombona ou endereço físico.</p><div className="search-wrap"><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar código, bombona ou endereço..."/><button className="scan-short" onClick={()=>setScanner(true)}><Camera size={19}/><span>Escanear</span></button></div></section>
      {query.trim() && result.items.length>0 && <ResultCards items={result.items} equivalent={result.kind==='equivalent'} onEdit={setEditor} onDelete={deleteItem} onCopy={copy}/>} 
      {query.trim() && result.items.length===0 && <div className="empty-search"><b>Código não encontrado</b><span>{query}</span>{result.suggestion&&<button onClick={()=>setQuery(result.suggestion!)}>Você quis dizer <b>{result.suggestion}</b>?</button>}<button className="primary-button" onClick={()=>setEditor({codigo:query})}>Cadastrar este código</button></div>}
      {!query.trim() && <section className="quick"><div><div className="section-head"><b>Recentes</b><button onClick={()=>{setRecent([]);localStorage.removeItem(recentKey)}}>Limpar</button></div><div className="chips">{recent.length?recent.map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>):<span>Nenhuma pesquisa recente.</span>}</div></div><div><div className="section-head"><b>Favoritos</b></div><div className="chips">{favorites.length?favorites.map(x=><button key={x} onClick={()=>setQuery(x)}><Star size={14}/>{x}</button>):<span>Marque consultas frequentes nos resultados.</span>}</div></div></section>}</>}
      {showItems && <section className="page"><div className="page-title"><div><h2>Itens</h2><p>{all.length} localizações cadastradas</p></div><button className="primary-button" onClick={()=>setEditor({})}><PackagePlus size={17}/>Novo item</button></div><div className="table-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar código, bombona ou endereço"/></div><div className="table-wrap"><table><thead><tr><th>Código</th><th>Bombona</th><th>Endereço</th><th>Descritivo</th><th>Quantidade</th><th></th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td><b>{x.codigo}</b></td><td>{x.bombona}</td><td>{x.endereco}</td><td>{x.descritivo||'—'}</td><td>{x.quantidade??'—'}</td><td><button className="table-action" onClick={()=>setEditor(x)}>Editar</button></td></tr>)}</tbody></table></div></section>}
      {showCarts && <CartsPage inventory={all} onOpenInventoryCode={openHomeSearch}/>} 
      {showData && <section className="page"><div className="page-title"><div><h2>Dados e Backup</h2><p>Proteja e transporte a base local.</p></div></div><div className="data-grid"><button onClick={exportBackup}><Download/><b>Exportar backup</b><span>Salva toda a base em JSON.</span></button><label><Upload/><b>Importar backup</b><span>Substitui a base após confirmação.</span><input type="file" accept="application/json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(!confirm('Substituir a base atual pelo backup selecionado?'))return;try{const n=await importBackup(f);await refresh();notify(`${n} registros importados`)}catch(err){alert(err instanceof Error?err.message:'Backup inválido')}}}/></label><button onClick={exportCSV}><FileDown/><b>Exportar CSV</b><span>Arquivo compatível com Excel.</span></button></div></section>}
    </main>
    <footer><span>Banco local IndexedDB · {all.length} registros</span><button onClick={()=>toggleFav(query.trim().toUpperCase())} disabled={!query.trim()}><Star size={14}/> {favorites.includes(query.trim().toUpperCase())?'Remover favorito':'Favoritar pesquisa'}</button></footer>
    {scanner&&<ScannerModal onDetected={detect} onClose={()=>setScanner(false)}/>} {editor&&<ItemModal initial={editor} onClose={()=>setEditor(null)} onSaved={async()=>{await refresh();if(query)setResult(await searchInventory(query));notify(editor.id?'Alterações salvas':'Item salvo')}}/>} {toast&&<div className="toast">{toast}</div>}
  </div>
}
