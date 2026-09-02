import fs from 'node:fs'

const file = 'src/features/carts/CartsPage.tsx'
let source = fs.readFileSync(file, 'utf8')
let changed = false

const importAnchor = "import { LuminaireMark } from './LuminaireMark'\n"
const carouselImport = "import { LuminaireImageCarousel } from './LuminaireImageCarousel'\n"
if (!source.includes(carouselImport)) {
  if (!source.includes(importAnchor)) throw new Error('Import anchor for LuminaireMark not found.')
  source = source.replace(importAnchor, importAnchor + carouselImport)
  changed = true
}

const oldSelectionBlock = `  const selectedImages=useMemo(()=>getLuminaireImages(selected),[selected])
  const selectedImage=selectedImages[0]??null
  const selectedIsErj=selected?.id==='luminaria-erj'
  const selectedHasGallery=selectedImages.length>1&&!selectedIsErj
`
const newSelectionBlock = `  const selectedImages=useMemo(()=>getLuminaireImages(selected),[selected])
  const selectedIsErj=selected?.id==='luminaria-erj'
`
if (source.includes(oldSelectionBlock)) {
  source = source.replace(oldSelectionBlock, newSelectionBlock)
  changed = true
} else if (!source.includes(newSelectionBlock)) {
  throw new Error('Luminaire image selection block not found.')
}

const oldReferenceBlock = `      {selected&&selectedImage&&!selectedIsErj&&<div className={\`cart-luminaire-reference \${selectedHasGallery?'cart-luminaire-reference--gallery':''}\`}>
        <button className="cart-luminaire-photo" type="button" onClick={()=>setPhotoViewer({src:selectedImage,label:\`Foto principal da \${selected.nome}\`})} aria-label={\`Ampliar foto principal da \${selected.nome}\`}>
          <img src={selectedImage} alt={\`Foto principal da \${selected.nome}\`} decoding="async"/>
          <span><Maximize2 size={15}/>Ampliar foto</span>
        </button>
        <div className="cart-luminaire-photo-copy"><small>Referência visual</small><strong>{selected.nome}</strong><p>{selectedHasGallery?'Três vistas restauradas das luminárias 016 e 017, preservando as referências fornecidas.':'Foto correspondente a esta luminária. A imagem é exibida por inteiro, sem recortes.'}</p><button className="secondary-button" type="button" onClick={()=>setPhotoViewer({src:selectedImage,label:\`Foto principal da \${selected.nome}\`})}><Maximize2 size={16}/>Visualizar em tamanho maior</button></div>
        {selectedHasGallery&&<div className="cart-luminaire-gallery" aria-label={\`Galeria da \${selected.nome}\`}>
          {selectedImages.map((src,index)=><button key={src} type="button" onClick={()=>setPhotoViewer({src,label:\`Vista \${index+1} da \${selected.nome}\`})} aria-label={\`Ampliar vista \${index+1} da \${selected.nome}\`}><img src={src} alt={\`Vista \${index+1} da \${selected.nome}\`} decoding="async"/><span>Vista {index+1}</span></button>)}
        </div>}
      </div>}
`

const newReferenceBlock = `      {selected&&selectedImages.length>0&&!selectedIsErj&&<LuminaireImageCarousel images={selectedImages} luminaireName={selected.nome} onOpen={(src,label)=>setPhotoViewer({src,label})}/>}
`

if (source.includes(oldReferenceBlock)) {
  source = source.replace(oldReferenceBlock, newReferenceBlock)
  changed = true
} else if (!source.includes(newReferenceBlock)) {
  throw new Error('Legacy luminaire reference/gallery block not found.')
}

fs.writeFileSync(file, source)
console.log(changed ? 'Galeria das luminárias convertida para carrossel de imagem única.' : 'Carrossel das luminárias já estava aplicado.')
