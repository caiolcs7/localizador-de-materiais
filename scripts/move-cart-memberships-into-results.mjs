import fs from 'node:fs'

const appPath = 'src/App.tsx'
let source = fs.readFileSync(appPath, 'utf8')
let changed = false

const oldImport = "import { cartsStorageKey, findCartMemberships, loadCurrentCarts } from './features/carts/cartLookup'"
const newImport = "import { cartsStorageKey, loadCurrentCarts } from './features/carts/cartLookup'"
if (source.includes(oldImport)) {
  source = source.replace(oldImport, newImport)
  changed = true
}

const derivedStart = source.indexOf('  const cartMemberships=useMemo')
const derivedEnd = derivedStart >= 0 ? source.indexOf('\n\n  const itemRows=', derivedStart) : -1
if (derivedStart >= 0 && derivedEnd > derivedStart) {
  source = source.slice(0, derivedStart) + source.slice(derivedEnd + 2)
  changed = true
}

const oldBlockStart = source.indexOf('      {showCartMembershipInfo&&<section')
const resultCardsStart = oldBlockStart >= 0
  ? source.indexOf('      {query.trim() && result.items.length>0 && <ResultCards', oldBlockStart)
  : -1
if (oldBlockStart >= 0 && resultCardsStart > oldBlockStart) {
  source = source.slice(0, oldBlockStart) + source.slice(resultCardsStart)
  changed = true
}

const resultCardsWithoutCarts = "<ResultCards items={result.items} equivalent={result.kind==='equivalent'}"
const resultCardsWithCarts = "<ResultCards items={result.items} carts={currentCarts} equivalent={result.kind==='equivalent'}"
if (source.includes(resultCardsWithoutCarts)) {
  source = source.replace(resultCardsWithoutCarts, resultCardsWithCarts)
  changed = true
}

if (!source.includes(resultCardsWithCarts)) {
  throw new Error('Não foi possível confirmar que ResultCards recebe os carrinhos atuais.')
}
if (source.includes('showCartMembershipInfo&&<section')) {
  throw new Error('O bloco antigo de carrinhos ainda está presente acima dos resultados.')
}

if (changed) fs.writeFileSync(appPath, source)
console.log(changed ? 'Associação de carrinhos movida para dentro dos cartões de resultado.' : 'App já estava com a associação de carrinhos dentro dos resultados.')
