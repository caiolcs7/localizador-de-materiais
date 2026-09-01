import fs from 'node:fs'

const carts = JSON.parse(fs.readFileSync(new URL('../src/data/cartsData.json', import.meta.url), 'utf8'))
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const expectedCounts = new Map([
  ['Luminária AVF', 29],
  ['010 Baby Mini Baby', 18],
  ['Luminária 254', 7],
  ['Luminária 014', 25],
  ['Luminária ERJ', 16],
  ['Luminária 984', 13],
  ['Luminária 035', 11],
  ['Luminária MAS', 15],
  ['Luminária L75', 5],
  ['Luminária 948-920', 10],
  ['Luminária CAS', 9]
])

assert(Array.isArray(carts), 'cartsData.json precisa ser uma lista')
assert(carts.length === 11, `Esperadas 11 luminárias; encontradas ${carts.length}`)
assert(new Set(carts.map(cart => cart.id)).size === carts.length, 'Há IDs de luminária duplicados')

let total = 0
const allCodes = new Set()
for (const cart of carts) {
  assert(expectedCounts.has(cart.sourceSheet), `Aba inesperada: ${cart.sourceSheet}`)
  assert(cart.items.length === expectedCounts.get(cart.sourceSheet), `${cart.sourceSheet}: esperado ${expectedCounts.get(cart.sourceSheet)} itens; encontrado ${cart.items.length}`)
  assert(cart.nome && cart.sourceSheet && cart.id, `${cart.sourceSheet}: metadados obrigatórios ausentes`)

  const codesInCart = new Set()
  for (const item of cart.items) {
    assert(typeof item.codigo === 'string' && item.codigo.trim(), `${cart.sourceSheet}: código vazio`)
    assert(typeof item.descritivo === 'string' && item.descritivo.trim(), `${cart.sourceSheet}: descritivo vazio em ${item.codigo}`)
    assert(!codesInCart.has(item.codigo), `${cart.sourceSheet}: código duplicado dentro da mesma luminária: ${item.codigo}`)
    assert(item.quantidade == null, `${cart.sourceSheet}: quantidade foi preenchida sem existir na planilha: ${item.codigo}`)
    codesInCart.add(item.codigo)
    allCodes.add(item.codigo)
    total += 1
  }
}

assert(total === 158, `Esperadas 158 relações luminária/material; encontradas ${total}`)
assert(allCodes.size === 95, `Esperados 95 códigos distintos; encontrados ${allCodes.size}`)

const has = (sheet, code) => carts.some(cart => cart.sourceSheet === sheet && cart.items.some(item => item.codigo === code))
assert(has('Luminária AVF', 'ITPFPHM410PAAI6'), 'AVF sem ITPFPHM410PAAI6')
assert(has('010 Baby Mini Baby', 'ITPFPHM525PAAI4'), '010/Baby/Mini Baby sem ITPFPHM525PAAI4')
assert(has('Luminária 014', 'ITL014DIV012I'), 'Luminária 014 sem ITL014DIV012I')
assert(has('Luminária 984', 'ITL98400023'), 'Luminária 984 sem ITL98400023')
assert(has('Luminária MAS', 'J9900000900'), 'Luminária MAS sem J9900000900')
assert(has('Luminária CAS', 'ITLCASCJ00096'), 'Luminária CAS sem ITLCASCJ00096')

console.log(`OK: 11 luminárias; 158 relações; 95 códigos distintos; contagens, campos e amostras críticas validados.`)
