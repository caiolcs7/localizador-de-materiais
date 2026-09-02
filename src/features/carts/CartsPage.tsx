import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Filter, Home, Lock, LockOpen, MapPin, Maximize2, PackagePlus, Pencil, Plus, Search, ShieldCheck, ShoppingCart, Trash2, X, XCircle } from 'lucide-react'
import type { InventoryLocation } from '../../types/inventory'
import type { CartItem, LuminaireCart } from '../../types/cart'
import { normalizeSearch } from '../../utils/normalize'
import { categoryForItem, findInventoryLocations } from './cartUtils'
import { getLuminaireImages } from './luminaireImages'
import { MaterialVisual } from '../materials/MaterialVisual'
import { LuminaireMark } from './LuminaireMark'
import { cart016017MigrationKey, cartsStorageKey, loadCurrentCarts } from './cartData'
import './carts.css'
import './luminaire-images.css'
import './material-cart-layout.css'
import './luminaire-theme.css'

const ErjModel3D = lazy(() => import('./ErjModel3D'))

const erjPhotoReferences = [
  { path: 'luminarias/lum-erj-front.webp', label: 'Vista frontal' },
  { path: 'luminarias/lum-erj-side.webp', label: 'Vista lateral' },
  { path: 'luminarias/lum-erj-rear.webp', label: 'Vista traseira' },
]

type Props = {
  inventory: InventoryLocation[]
  onOpenInventoryCode: (code: string) => void
  onBackHome: () => void
  onRefreshInventory: () => Promise<void> | void
}

type LocationFilter = 'all' | 'located' | 'unlocated'
const cartsAdminKey = 'lm-carts-admin-v1'
const adminPassword = '3007'

function loadCarts() {
  const carts = loadCurrentCarts()
  localStorage.setItem(cart016017MigrationKey, '1')
  return carts
}

function slug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `carrinho-${Date.now()}`
}

function PasswordModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    if (password === adminPassword) onUnlock()
    else setError('Senha incorreta.')
  }
  return <div className="modal-backdrop"><div className="form-modal compact-modal">
    <div className="modal-head"><div><b>Desbloquear edição dos Carrinhos</b><span>Digite a senha administrativa.</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <div className="form-grid single-column"><label>Senha<input autoFocus type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter')submit()}} placeholder="Digite a senha"/></label></div>
    {error&&<div className="error-box">{error}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={submit}><ShieldCheck size={16}/>Desbloquear</button></div>
  </div></div>
}

function CartModal({ initial, onClose, onSave }: { initial?: LuminaireCart; onClose: () => void; onSave: (name: string, sourceSheet: string) => void }) {
  const [name,setName]=useState(initial?.nome??'')
  const [sourceSheet,setSourceSheet]=useState(initial?.sourceSheet??'')
  const [error,setError]=useState('')
  const submit=()=>{if(!name.trim()){setError('Informe o nome do carrinho.');return}onSave(name.trim(),sourceSheet.trim()||name.trim())}
  return <div className="modal-backdrop"><div className="form-modal compact-modal">
    <div className="modal-head"><div><b>{initial?'Editar carrinho':'Novo carrinho'}</b><span>Cadastre ou ajuste uma luminária.</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <div className="form-grid single-column"><label>Nome do carrinho<input autoFocus value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="Ex.: Luminária Modelo X"/></label><label>Origem / aba <span>(opcional)</span><input value={sourceSheet} onChange={e=>setSourceSheet(e.target.value)} placeholder="Ex.: Cadastro manual"/></label></div>
    {error&&<div className="error-box">{error}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={submit}>{initial?'Salvar alterações':'Criar carrinho'}</button></div>
  </div></div>
}

function CartItemModal({ initial, cartName, onClose, onSave }: { initial?: CartItem; cartName: string; onClose: () => void; onSave: (item: CartItem) => void }) {
  const [form,setForm]=useState({codigo:initial?.codigo??'',descritivo:initial?.descritivo??'',quantidade:initial?.quantidade==null?'':String(initial.quantidade),unidade:initial?.unidade??'',categoria:initial?.categoria??'',observacoes:initial?.observacoes??''})
  const [error,setError]=useState('')
  const field=(key:keyof typeof form,value:string)=>{setForm(current=>({...current,[key]:value}));setError('')}
  const submit=()=>{
    if(!form.codigo.trim()){setError('Informe o código do item.');return}
    const quantity=form.quantidade.trim()===''?null:Number(form.quantidade.replace(',','.'))
    if(quantity!==null&&!Number.isFinite(quantity)){setError('Quantidade inválida.');return}
    onSave({id:initial?.id??crypto.randomUUID(),codigo:form.codigo.trim().toUpperCase(),descritivo:form.descritivo.trim()||null,quantidade:quantity,unidade:form.unidade.trim()||null,categoria:form.categoria.trim()||null,observacoes:form.observacoes.trim()||null,linhaOrigem:initial?.linhaOrigem??null})
  }
  return <div className="modal-backdrop"><div className="form-modal">
    <div className="modal-head"><div><b>{initial?'Editar item do carrinho':'Novo item no carrinho'}</b><span>{cartName}</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div>
    <div className="form-grid"><label>Código<input autoFocus value={form.codigo} onChange={e=>field('codigo',e.target.value)} placeholder="ITPFPHM408PAAI4"/></label><label>Categoria <span>(opcional)</span><input value={form.categoria} onChange={e=>field('categoria',e.target.value)} placeholder="Parafusos"/></label><label>Quantidade <span>(opcional)</span><input inputMode="decimal" value={form.quantidade} onChange={e=>field('quantidade',e.target.value)} placeholder="—"/></label><label>Unidade <span>(opcional)</span><input value={form.unidade} onChange={e=>field('unidade',e.target.value)} placeholder="un"/></label><label className="full">Descritivo <span>(opcional)</span><input value={form.descritivo} onChange={e=>field('descritivo',e.target.value)}/></label><label className="full">Observações <span>(opcional)</span><textarea rows={3} value={form.observacoes} onChange={e=>field('observacoes',e.target.value)}/></label></div>
    {error&&<div className="error-box">{error}</div>}
    <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={submit}>{initial?'Salvar item':'Adicionar item'}</button></div>
  </div></div>
}

export function CartsPage({ inventory, onOpenInventoryCode, onBackHome, onRefreshInventory }: Props) {
  const [carts,setCarts]=useState<LuminaireCart[]>(()=>loadCarts())
  const [selectedId,setSelectedId]=useState(()=>loadCarts()[0]?.id??'')
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('Todos')
  const [locationFilter,setLocationFilter]=useState<LocationFilter>('all')
  const [adminUnlocked,setAdminUnlocked]=useState(()=>sessionStorage.getItem(cartsAdminKey)==='1')
  const [showPassword,setShowPassword]=useState(false)
  const [cartEditor,setCartEditor]=useState<LuminaireCart|'new'|null>(null)
  const [itemEditor,setItemEditor]=useState<CartItem|'new'|null>(null)
  const [pickerOpen,setPickerOpen]=useState(false)
  const [pickerQuery,setPickerQuery]=useState('')
  const [photoViewer,setPhotoViewer]=useState<{src:string;label:string}|null>(null)

  useEffect(()=>{localStorage.setItem(cartsStorageKey,JSON.stringify(carts));if(!carts.some(cart=>cart.id===selectedId))setSelectedId(carts[0]?.id??'')},[carts,selectedId])

  // Carrinhos never store bombona/address. They always read locations from the
  // main inventory. Refreshing here guarantees that returning to this page,
  // focusing the browser, or coming back from another tab reflects edits.
  useEffect(()=>{
    void onRefreshInventory()
    const sync=()=>{void onRefreshInventory()}
    const onVisibility=()=>{if(!document.hidden)sync()}
    window.addEventListener('focus',sync)
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',onVisibility)}
  },[onRefreshInventory])

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setPickerOpen(false);setPhotoViewer(null)}}
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[])

  const selected=useMemo(()=>carts.find(cart=>cart.id===selectedId)??carts[0],[carts,selectedId])
  const selectedImages=useMemo(()=>getLuminaireImages(selected),[selected])
  const selectedImage=selectedImages[0]??null
  const selectedIsErj=selected?.id==='luminaria-erj'
  const selectedHasGallery=selectedImages.length>1&&!selectedIsErj
  const erjPhotos=useMemo(()=>erjPhotoReferences.map(photo=>({...photo,src:`${import.meta.env.BASE_URL}${photo.path}`})),[])
  const enriched=useMemo(()=>(selected?.items??[]).map((item,index)=>{
    const locations=findInventoryLocations(item.codigo,inventory)
    const exact=locations.some(location=>[location.codigo,...(location.aliases??[])].some(code=>normalizeSearch(code)===normalizeSearch(item.codigo)))
    return {item,index,category:categoryForItem(item),locations,equivalentOnly:locations.length>0&&!exact}
  }),[selected,inventory])
  const categories=useMemo(()=>['Todos',...Array.from(new Set(enriched.map(row=>row.category))).sort((a,b)=>a.localeCompare(b,'pt-BR'))],[enriched])
  useEffect(()=>{if(!categories.includes(category))setCategory('Todos')},[categories,category])
  const filtered=useMemo(()=>{const q=normalizeSearch(query);return enriched.filter(row=>{if(category!=='Todos'&&row.category!==category)return false;if(locationFilter==='located'&&row.locations.length===0)return false;if(locationFilter==='unlocated'&&row.locations.length>0)return false;if(!q)return true;return normalizeSearch(`${row.item.codigo} ${row.item.descritivo??''} ${row.category}`).includes(q)})},[enriched,query,category,locationFilter])
  const located=enriched.filter(row=>row.locations.length>0).length
  const pickerCarts=useMemo(()=>{const q=normalizeSearch(pickerQuery);return carts.filter(cart=>!q||normalizeSearch(`${cart.nome} ${cart.sourceSheet}`).includes(q))},[carts,pickerQuery])

  const chooseCart=(id:string)=>{setSelectedId(id);setQuery('');setCategory('Todos');setLocationFilter('all');setPickerOpen(false);setPickerQuery('');setPhotoViewer(null);void onRefreshInventory()}
  const unlock=()=>{sessionStorage.setItem(cartsAdminKey,'1');setAdminUnlocked(true);setShowPassword(false)}
  const lock=()=>{sessionStorage.removeItem(cartsAdminKey);setAdminUnlocked(false);setCartEditor(null);setItemEditor(null)}
  const saveCart=(name:string,sourceSheet:string)=>{
    if(cartEditor&&cartEditor!=='new')setCarts(current=>current.map(cart=>cart.id===cartEditor.id?{...cart,nome:name,sourceSheet}:cart))
    else {
      const base=slug(name);let id=base;let suffix=2;const ids=new Set(carts.map(cart=>cart.id));while(ids.has(id)){id=`${base}-${suffix++}`}
      const newCart:LuminaireCart={id,nome:name,sourceSheet,items:[]};setCarts(current=>[...current,newCart]);setSelectedId(id)
    }
    setCartEditor(null)
  }
  const deleteCart=()=>{if(!selected)return;if(!confirm(`Excluir o carrinho ${selected.nome} e todos os itens dele?`))return;setCarts(current=>current.filter(cart=>cart.id!==selected.id))}
  const saveItem=(item:CartItem)=>{if(!selected)return;setCarts(current=>current.map(cart=>cart.id!==selected.id?cart:{...cart,items:itemEditor&&itemEditor!=='new'?cart.items.map(existing=>existing.id===itemEditor.id?item:existing):[...cart.items,item]}));setItemEditor(null)}
  const deleteCartItem=(item:CartItem)=>{if(!selected)return;if(!confirm(`Excluir ${item.codigo} do carrinho ${selected.nome}?`))return;setCarts(current=>current.map(cart=>cart.id!==selected.id?cart:{...cart,items:cart.items.filter(existing=>existing.id!==item.id)}))}

  return <section className="page carts-page">
    <div className="page-title carts-title"><div><h2>Carrinhos</h2><p>Composição, filtros e localização de materiais por luminária.</p></div><div className="carts-top-actions"><button className="secondary-button" onClick={onBackHome}><Home size={16}/>Voltar ao início</button>{adminUnlocked&&<><button className="secondary-button" onClick={()=>setCartEditor('new')}><Plus size={16}/>Novo carrinho</button><button className="primary-button" onClick={()=>setItemEditor('new')} disabled={!selected}><PackagePlus size={16}/>Novo item</button></>}</div></div>

    {!carts.length?<div className="carts-empty"><ShoppingCart size={34}/><b>Nenhum carrinho cadastrado</b><p>Desbloqueie a edição para criar o primeiro carrinho.</p></div>:<>
      <div className="luminaire-switcher-wrap">
        <button className={`luminaire-switcher ${pickerOpen?'open':''}`} onClick={()=>setPickerOpen(value=>!value)} aria-expanded={pickerOpen}>
          <LuminaireMark name={selected?.nome??'Luminária'}/>
          <span className="luminaire-switcher-copy"><small>Luminária selecionada</small><strong>{selected?.nome}</strong><em>{selected?.items.length??0} itens · localizações sincronizadas com o almoxarifado</em></span>
          <span className="luminaire-switcher-chevron"><ChevronDown size={20}/></span>
        </button>
        {pickerOpen&&<>
          <button className="luminaire-picker-backdrop" aria-label="Fechar seletor" onClick={()=>setPickerOpen(false)}/>
          <div className="luminaire-picker-panel">
            <div className="luminaire-picker-head"><div><b>Trocar luminária</b><span>Selecione o carrinho que deseja consultar.</span></div><button className="picker-close" onClick={()=>setPickerOpen(false)}><X size={18}/></button></div>
            <div className="luminaire-picker-search"><Search size={17}/><input autoFocus value={pickerQuery} onChange={e=>setPickerQuery(e.target.value)} placeholder="Buscar luminária..."/></div>
            <div className="luminaire-picker-grid">
              {pickerCarts.map(cart=><button key={cart.id} className={`luminaire-option ${cart.id===selected?.id?'selected':''}`} onClick={()=>chooseCart(cart.id)}>
                <LuminaireMark name={cart.nome} compact/>
                <span className="luminaire-option-copy"><b>{cart.nome}</b><small>{cart.items.length} itens · {cart.sourceSheet}</small></span>
                <span className="luminaire-option-check">{cart.id===selected?.id&&<Check size={17}/>}</span>
              </button>)}
              {!pickerCarts.length&&<div className="luminaire-picker-empty">Nenhuma luminária encontrada.</div>}
            </div>
          </div>
        </>}
      </div>

      {selected&&selectedIsErj&&<section className="erj-experience" aria-labelledby="erj-3d-title">
        <div className="erj-experience-head"><div><strong id="erj-3d-title">Luminária ERJ em 3D</strong><p>Examine a luminária antes de consultar os componentes do carrinho.</p></div><span className="erj-3d-badge">3D interativo</span></div>
        <Suspense fallback={<div className="erj-model-loading" role="status">Preparando o modelo 3D da ERJ…</div>}><ErjModel3D/></Suspense>
        <div className="erj-photo-gallery" aria-label="Fotos de referência da luminária ERJ">
          {erjPhotos.map(photo=><button key={photo.path} type="button" onClick={()=>setPhotoViewer({src:photo.src,label:`${photo.label} da ${selected.nome}`})} aria-label={`Ampliar ${photo.label.toLowerCase()} da ${selected.nome}`}><img src={photo.src} alt={photo.label} decoding="async"/><span><Maximize2 size={14}/>{photo.label}</span></button>)}
        </div>
      </section>}

      {selected&&selectedImage&&!selectedIsErj&&<div className={`cart-luminaire-reference ${selectedHasGallery?'cart-luminaire-reference--gallery':''}`}>
        <button className="cart-luminaire-photo" type="button" onClick={()=>setPhotoViewer({src:selectedImage,label:`Foto principal da ${selected.nome}`})} aria-label={`Ampliar foto principal da ${selected.nome}`}>
          <img src={selectedImage} alt={`Foto principal da ${selected.nome}`} decoding="async"/>
          <span><Maximize2 size={15}/>Ampliar foto</span>
        </button>
        <div className="cart-luminaire-photo-copy"><small>Referência visual</small><strong>{selected.nome}</strong><p>{selectedHasGallery?'Três vistas restauradas das luminárias 016 e 017, preservando as referências fornecidas.':'Foto correspondente a esta luminária. A imagem é exibida por inteiro, sem recortes.'}</p><button className="secondary-button" type="button" onClick={()=>setPhotoViewer({src:selectedImage,label:`Foto principal da ${selected.nome}`})}><Maximize2 size={16}/>Visualizar em tamanho maior</button></div>
        {selectedHasGallery&&<div className="cart-luminaire-gallery" aria-label={`Galeria da ${selected.nome}`}>
          {selectedImages.map((src,index)=><button key={src} type="button" onClick={()=>setPhotoViewer({src,label:`Vista ${index+1} da ${selected.nome}`})} aria-label={`Ampliar vista ${index+1} da ${selected.nome}`}><img src={src} alt={`Vista ${index+1} da ${selected.nome}`} decoding="async"/><span>Vista {index+1}</span></button>)}
        </div>}
      </div>}

      <div className="carts-controls"><div className="sync-note"><MapPin size={16}/><div><b>Bombonas sincronizadas automaticamente</b><span>Ao editar a bombona/endereço de um código no Localizador, o Carrinho passa a mostrar a nova localização sem duplicar dados.</span></div></div><div className="table-search cart-search"><Search size={18}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar código ou descritivo no carrinho"/></div></div>

      <div className="cart-kpis"><div><ShoppingCart/><span>Itens do carrinho</span><strong>{enriched.length}</strong></div><div><MapPin/><span>Com localização</span><strong>{located}<small> / {enriched.length}</small></strong></div><div><XCircle/><span>Sem localização</span><strong>{enriched.length-located}</strong></div><div><Filter/><span>Categorias</span><strong>{Math.max(categories.length-1,0)}</strong></div></div>

      <div className="cart-filters"><div className="filter-label"><Filter size={15}/>Filtros</div><div className="filter-chips">{categories.map(value=><button key={value} className={category===value?'active':''} onClick={()=>setCategory(value)}>{value}</button>)}</div><div className="filter-row"><button className={locationFilter==='all'?'active':''} onClick={()=>setLocationFilter('all')}>Todos</button><button className={locationFilter==='located'?'active':''} onClick={()=>setLocationFilter('located')}>Com localização</button><button className={locationFilter==='unlocated'?'active warning':''} onClick={()=>setLocationFilter('unlocated')}>Sem localização</button></div></div>

      <div className="cart-context"><div><b>{selected?.nome}</b><span>Aba de origem: {selected?.sourceSheet}</span></div><div className="cart-context-actions"><span>{filtered.length} {filtered.length===1?'item exibido':'itens exibidos'}</span>{adminUnlocked&&selected&&<><button onClick={()=>setCartEditor(selected)}><Pencil size={14}/>Editar carrinho</button><button className="danger-text" onClick={deleteCart}><Trash2 size={14}/>Excluir carrinho</button></>}</div></div>

      <div className="cart-list">{filtered.map(row=>{const uniqueBombonas=Array.from(new Set(row.locations.map(location=>location.bombona)));return <article className="cart-item" key={row.item.id??`${selected?.id}-${row.index}-${row.item.codigo}`}><MaterialVisual code={row.item.codigo} description={row.item.descritivo}/><div className="cart-item-main"><div className="cart-item-heading"><strong>{row.item.codigo}</strong><span className="category-badge">{row.category}</span>{row.equivalentOnly&&<span className="equivalent-badge">AI4/AI6</span>}</div><p>{row.item.descritivo||'Sem descritivo informado'}</p><div className="cart-item-meta"><span>Qtd.: <b>{row.item.quantidade??'—'}</b>{row.item.unidade?` ${row.item.unidade}`:''}</span>{row.item.observacoes&&<span>{row.item.observacoes}</span>}</div></div><div className="cart-location">{row.locations.length?<><span className="location-status ok"><MapPin size={14}/>Localizado</span><div className="bombona-list">{uniqueBombonas.slice(0,3).map(bombona=><span key={bombona}>{bombona}</span>)}{uniqueBombonas.length>3&&<span>+{uniqueBombonas.length-3}</span>}</div><button onClick={()=>onOpenInventoryCode(row.item.codigo)}>Ver no Localizador</button></>:<><span className="location-status missing"><XCircle size={14}/>Sem localização cadastrada</span><small>Assim que este código receber bombona/endereço no Localizador, esta informação aparecerá aqui automaticamente.</small><button onClick={()=>onOpenInventoryCode(row.item.codigo)}>Pesquisar código</button></>}</div>{adminUnlocked&&<div className="cart-admin-actions"><button title="Editar item" onClick={()=>setItemEditor(row.item)}><Pencil size={16}/></button><button title="Excluir item" onClick={()=>deleteCartItem(row.item)}><Trash2 size={16}/></button></div>}</article>})}{!filtered.length&&<div className="cart-no-results"><b>Nenhum item neste filtro.</b><span>Altere a categoria, a pesquisa ou o status de localização.</span></div>}</div>
    </>}

    <div className="carts-edit-access">
      <button type="button" className="carts-edit-access-button" onClick={adminUnlocked ? lock : () => setShowPassword(true)}>
        {adminUnlocked ? <LockOpen size={18}/> : <Lock size={18}/>}
        <span>{adminUnlocked ? 'Bloquear edição' : 'Desbloquear edição'}</span>
      </button>
    </div>

    {photoViewer&&selected&&<div className="luminaire-photo-viewer" role="dialog" aria-modal="true" aria-label={photoViewer.label} onClick={()=>setPhotoViewer(null)}><div className="luminaire-photo-dialog" onClick={event=>event.stopPropagation()}><div className="luminaire-photo-dialog-head"><b>{selected.nome} · {photoViewer.label.replace(` da ${selected.nome}`,'')}</b><button type="button" onClick={()=>setPhotoViewer(null)} aria-label="Fechar foto"><X size={22}/></button></div><img src={photoViewer.src} alt={photoViewer.label}/></div></div>}
    {showPassword&&<PasswordModal onClose={()=>setShowPassword(false)} onUnlock={unlock}/>} 
    {cartEditor&&<CartModal initial={cartEditor==='new'?undefined:cartEditor} onClose={()=>setCartEditor(null)} onSave={saveCart}/>} 
    {itemEditor&&selected&&<CartItemModal initial={itemEditor==='new'?undefined:itemEditor} cartName={selected.nome} onClose={()=>setItemEditor(null)} onSave={saveItem}/>} 
  </section>
}
