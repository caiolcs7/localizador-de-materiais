import fs from 'node:fs'

const cartsPagePath = 'src/features/carts/CartsPage.tsx'
const cartsCssPath = 'src/features/carts/carts.css'

const oldHeader = `    <div className="page-title carts-title"><div><h2>Carrinhos</h2><p>Composição, filtros e localização de materiais por luminária.</p></div><div className="carts-top-actions"><button className="secondary-button" onClick={onBackHome}><Home size={16}/>Voltar ao início</button>{adminUnlocked?<><button className="secondary-button" onClick={()=>setCartEditor('new')}><Plus size={16}/>Novo carrinho</button><button className="primary-button" onClick={()=>setItemEditor('new')} disabled={!selected}><PackagePlus size={16}/>Novo item</button><button className="secondary-button" onClick={lock}><LockOpen size={16}/>Bloquear edição</button></>:<button className="primary-button" onClick={()=>setShowPassword(true)}><Lock size={16}/>Desbloquear edição</button>}</div></div>`

const newHeader = `    <div className="page-title carts-title"><div><h2>Carrinhos</h2><p>Composição, filtros e localização de materiais por luminária.</p></div><div className="carts-top-actions"><button className="secondary-button" onClick={onBackHome}><Home size={16}/>Voltar ao início</button>{adminUnlocked&&<><button className="secondary-button" onClick={()=>setCartEditor('new')}><Plus size={16}/>Novo carrinho</button><button className="primary-button" onClick={()=>setItemEditor('new')} disabled={!selected}><PackagePlus size={16}/>Novo item</button></>}</div></div>`

const modalAnchor = `    {photoViewer&&selected&&<div className="luminaire-photo-viewer"`
const footerControl = `    <div className="carts-edit-access">
      <button type="button" className="carts-edit-access-button" onClick={adminUnlocked ? lock : () => setShowPassword(true)}>
        {adminUnlocked ? <LockOpen size={18}/> : <Lock size={18}/>}
        <span>{adminUnlocked ? 'Bloquear edição' : 'Desbloquear edição'}</span>
      </button>
    </div>

`

const cssMarker = '/* carts-edit-access-footer */'
const css = `

${cssMarker}
.carts-edit-access {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 0 8px;
}

.carts-edit-access-button {
  min-width: 12.5em;
  height: 2.3em;
  margin: 0.5em;
  padding: 0 1.25em;
  background: black;
  color: white;
  border: none;
  border-radius: 0.625em;
  font-family: "Bradley Hand", cursive;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  position: relative;
  z-index: 1;
  overflow: hidden;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45em;
  transition: color 0.5s;
}

.carts-edit-access-button > * {
  position: relative;
  z-index: 2;
}

.carts-edit-access-button:hover {
  color: black;
}

.carts-edit-access-button::after {
  content: "";
  background: white;
  position: absolute;
  z-index: 1;
  left: -20%;
  right: -20%;
  top: 0;
  bottom: 0;
  transform: skewX(-45deg) scale(0, 1);
  transform-origin: center;
  transition: transform 0.5s;
}

.carts-edit-access-button:hover::after {
  transform: skewX(-45deg) scale(1, 1);
}

.carts-edit-access-button:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .carts-edit-access {
    padding-top: 24px;
  }

  .carts-edit-access-button {
    width: min(100%, 16em);
    min-width: 0;
  }
}
`

let page = fs.readFileSync(cartsPagePath, 'utf8')
let pageChanged = false

if (page.includes(oldHeader)) {
  page = page.replace(oldHeader, newHeader)
  pageChanged = true
} else if (!page.includes(newHeader)) {
  throw new Error('Não foi possível localizar o cabeçalho esperado dos Carrinhos.')
}

if (!page.includes('className="carts-edit-access"')) {
  const index = page.indexOf(modalAnchor)
  if (index === -1) throw new Error('Não foi possível localizar o ponto de inserção do botão no fim da página.')
  page = page.slice(0, index) + footerControl + page.slice(index)
  pageChanged = true
}

if (pageChanged) fs.writeFileSync(cartsPagePath, page)

let cartsCss = fs.readFileSync(cartsCssPath, 'utf8')
if (!cartsCss.includes(cssMarker)) {
  cartsCss += css
  fs.writeFileSync(cartsCssPath, cartsCss)
}

console.log(pageChanged ? 'CartsPage atualizado.' : 'CartsPage já estava atualizado.')
console.log(cartsCss.includes(cssMarker) ? 'Estilo do botão confirmado.' : 'Falha ao aplicar estilo.')
