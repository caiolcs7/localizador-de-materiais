import fs from 'node:fs'

const carts = [
  ...JSON.parse(fs.readFileSync(new URL('../src/data/cartsData.json', import.meta.url), 'utf8')),
  JSON.parse(fs.readFileSync(new URL('../src/data/cart016017.json', import.meta.url), 'utf8')),
]
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
  ['Luminária CAS', 9],
  ['Luminária 016/017', 10],
])

const allowedDuplicateCounts = new Map([
  ['Luminária 948-920::ITPFPHM408PABC', 2]
])

assert(Array.isArray(carts), 'cartsData.json precisa ser uma lista')
assert(carts.length === 12, `Esperadas 12 luminárias; encontradas ${carts.length}`)
assert(new Set(carts.map(cart => cart.id)).size === carts.length, 'Há IDs de luminária duplicados')

let total = 0
const allCodes = new Set()
for (const cart of carts) {
  assert(expectedCounts.has(cart.sourceSheet), `Aba inesperada: ${cart.sourceSheet}`)
  assert(cart.items.length === expectedCounts.get(cart.sourceSheet), `${cart.sourceSheet}: esperado ${expectedCounts.get(cart.sourceSheet)} itens; encontrado ${cart.items.length}`)
  assert(cart.nome && cart.sourceSheet && cart.id, `${cart.sourceSheet}: metadados obrigatórios ausentes`)

  const codeCounts = new Map()
  for (const item of cart.items) {
    assert(typeof item.codigo === 'string' && item.codigo.trim(), `${cart.sourceSheet}: código vazio`)
    assert(typeof item.descritivo === 'string' && item.descritivo.trim(), `${cart.sourceSheet}: descritivo vazio em ${item.codigo}`)

    const count = (codeCounts.get(item.codigo) ?? 0) + 1
    codeCounts.set(item.codigo, count)
    const duplicateKey = `${cart.sourceSheet}::${item.codigo}`
    const allowedCount = allowedDuplicateCounts.get(duplicateKey) ?? 1
    assert(count <= allowedCount, `${cart.sourceSheet}: código duplicado dentro da mesma luminária: ${item.codigo}`)

    assert(item.quantidade == null, `${cart.sourceSheet}: quantidade foi preenchida sem existir na planilha: ${item.codigo}`)
    allCodes.add(item.codigo)
    total += 1
  }

  for (const [key, expected] of allowedDuplicateCounts) {
    const [sheet, code] = key.split('::')
    if (sheet !== cart.sourceSheet) continue
    assert(codeCounts.get(code) === expected, `${sheet}: esperado ${expected} ocorrências intencionais de ${code}; encontrado ${codeCounts.get(code) ?? 0}`)
  }
}

assert(total === 168, `Esperadas 168 relações luminária/material; encontradas ${total}`)
assert(allCodes.size === 98, `Esperados 98 códigos distintos; encontrados ${allCodes.size}`)

const has = (sheet, code) => carts.some(cart => cart.sourceSheet === sheet && cart.items.some(item => item.codigo === code))
assert(has('Luminária AVF', 'ITPFPHM410PAAI6'), 'AVF sem ITPFPHM410PAAI6')
assert(has('010 Baby Mini Baby', 'ITPFPHM525PAAI4'), '010/Baby/Mini Baby sem ITPFPHM525PAAI4')
assert(has('Luminária 014', 'ITL014DIV012I'), 'Luminária 014 sem ITL014DIV012I')
assert(has('Luminária 984', 'ITL98400023'), 'Luminária 984 sem ITL98400023')
assert(has('Luminária MAS', 'J9900000900'), 'Luminária MAS sem J9900000900')
assert(has('Luminária CAS', 'ITLCASCJ00096'), 'Luminária CAS sem ITLCASCJ00096')

const cart948 = carts.find(cart => cart.sourceSheet === 'Luminária 948-920')
assert(cart948, 'Luminária 948-920 ausente')
for (const oldCode of ['ITARLSM004AC', 'ITARPRM04AC', 'ITPFPHM510PAAC', 'ITPFPHM408PAAC']) {
  assert(!cart948.items.some(item => item.codigo === oldCode), `Luminária 948-920 ainda contém código antigo: ${oldCode}`)
}
for (const newCode of ['ITARLSM004BC', 'ITARPRM04BC', 'ITPFPHM510PABC', 'ITPFPHM408PABC']) {
  assert(cart948.items.some(item => item.codigo === newCode), `Luminária 948-920 sem código novo: ${newCode}`)
}

const cart016017 = carts.find(cart => cart.sourceSheet === 'Luminária 016/017')
assert(cart016017?.nome === '016/017', 'Carrinho 016/017 ausente ou com nome incorreto')
const expected016017 = new Map([
  ['ITPFPHM508PABC', 'PARAFUSO AC PHILLIPS CAB PAN M5 08MM (BICROMATIZADO) - PESO UN: 0,00273 KG'],
  ['ITARLSM006BC', 'ARRUELA AC BICROMATIZADO LISA M6 - PESO UN: 0,00083 KG'],
  ['ITPFPHM506ESBC', 'PARAFUSO AC PHILLIPS AC CAB ESC M5 06MM (BICROMATIZADO)'],
  ['ITARLSM005BC', 'ARRUELA AC BICROMATIZADO LISA M5 - PESO UN: 0,00038 KG'],
  ['ITPFPHM416PABC', 'PARAFUSO AC PHILLIPS CAB PAN M4 16MM (BICROMATIZADO) - PESO UN: 0,00196 KG'],
  ['ITPRCSEM03BC', 'PORCA AC BICROMATIZADA SEXTAVADA M3 - PESO UN: 0,00032 KG'],
  ['ITARLSM003AI4', 'ARRUELA LISA AI M3 - PESO UN: 0,00012 KG'],
  ['ITPFPHM310PAAI4', 'PARAFUSO AI PHILLIPS CAB PAN M3 10MM - PESO UN: 0,00082 KG'],
  ['ITPRCSEM03AI4', 'PORCA AI SEXTAVADA M3 - PESO UN: 0,00032 KG'],
  ['ITARSRM003AI6', 'ARRUELA SERR INOX 316 M3'],
])
for (const [code, description] of expected016017) {
  assert(cart016017.items.some(item => item.codigo === code && item.descritivo === description), `Carrinho 016/017 sem dados exatos de ${code}`)
}

console.log(`OK: 12 luminárias; 168 relações; 98 códigos distintos; carrinho 016/017 e substituições validados.`)
