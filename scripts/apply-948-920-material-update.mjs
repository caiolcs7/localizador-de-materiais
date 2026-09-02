import fs from 'node:fs'

const cartsDataPath = 'src/data/cartsData.json'
const cartsPagePath = 'src/features/carts/CartsPage.tsx'
const cartDataPath = 'src/features/carts/cartData.ts'
const seedInventoryPath = 'src/data/seedInventory.json'
const targetCartId = 'luminaria-948-920'

const replacements = {
  ITARLSM004AC: {
    codigo: 'ITARLSM004BC',
    descritivo: 'ARRUELA AC BICROMATIZADO LISA M4 - PESO UN: 0,00029 KG',
  },
  ITARPRM04AC: {
    codigo: 'ITARPRM04BC',
    descritivo: 'ARRUELA AC BICROMATIZADO PRESSAO M4 - PESO UN: 0,00018 KG',
  },
  ITPFPHM510PAAC: {
    codigo: 'ITPFPHM510PABC',
    descritivo: 'PARAFUSO AC PHILLIPS AC CAB PAN M5 10MM (BICROMATIZADO) - PESO UN: 0,00276 KG',
  },
  ITPFPHM408PAAC: {
    codigo: 'ITPFPHM408PABC',
    descritivo: 'PARAFUSO AC PHILLIPS CAB PAN M4 08MM (BICROMATIZADO) - PESO UN: 0,0015 KG',
  },
}

const expectedNewCounts = {
  ITARLSM004BC: 1,
  ITARPRM04BC: 1,
  ITPFPHM510PABC: 1,
  ITPFPHM408PABC: 2,
}

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase()
}

// 1) Atualiza a composição padrão do carrinho, preservando duplicidades.
const carts = JSON.parse(fs.readFileSync(cartsDataPath, 'utf8'))
const cart = carts.find(entry => entry.id === targetCartId)
if (!cart) throw new Error('Carrinho Luminária 948/920 não encontrado em cartsData.json.')

cart.items = (cart.items ?? []).map(item => {
  const replacement = replacements[normalizeCode(item.codigo)]
  return replacement ? { ...item, ...replacement } : item
})

for (const oldCode of Object.keys(replacements)) {
  if (cart.items.some(item => normalizeCode(item.codigo) === oldCode)) {
    throw new Error(`Código antigo ainda presente no 948/920: ${oldCode}`)
  }
}

for (const [code, expected] of Object.entries(expectedNewCounts)) {
  const count = cart.items.filter(item => normalizeCode(item.codigo) === code).length
  if (count !== expected) {
    throw new Error(`Contagem inesperada de ${code}: esperado ${expected}, encontrado ${count}.`)
  }
}

fs.writeFileSync(cartsDataPath, JSON.stringify(carts))
console.log('Carrinho 948/920 atualizado sem remover duplicidades legítimas.')

// 2) Migra automaticamente quem já possui Carrinhos salvos no localStorage.
// Sem isso, alterar apenas cartsData.json não mudaria instalações que já abriram o app.
const migrationMarker = 'const cart948920ReplacementByCode = new Map'
const centralizedMigration = fs.existsSync(cartDataPath)
  && fs.readFileSync(cartDataPath, 'utf8').includes(migrationMarker)

if (centralizedMigration) {
  console.log('Migração de localStorage do 948/920 confirmada no módulo central de Carrinhos.')
} else {
  let page = fs.readFileSync(cartsPagePath, 'utf8')
  if (!page.includes(migrationMarker)) {
  const adminAnchor = "const adminPassword = '3007'\n"
  if (!page.includes(adminAnchor)) throw new Error('Ponto de inserção da migração não encontrado em CartsPage.tsx.')

  const migrationBlock = `const cart948920ReplacementByCode = new Map<string, { codigo: string; descritivo: string }>([\n  ['ITARLSM004AC', { codigo: 'ITARLSM004BC', descritivo: 'ARRUELA AC BICROMATIZADO LISA M4 - PESO UN: 0,00029 KG' }],\n  ['ITARPRM04AC', { codigo: 'ITARPRM04BC', descritivo: 'ARRUELA AC BICROMATIZADO PRESSAO M4 - PESO UN: 0,00018 KG' }],\n  ['ITPFPHM510PAAC', { codigo: 'ITPFPHM510PABC', descritivo: 'PARAFUSO AC PHILLIPS AC CAB PAN M5 10MM (BICROMATIZADO) - PESO UN: 0,00276 KG' }],\n  ['ITPFPHM408PAAC', { codigo: 'ITPFPHM408PABC', descritivo: 'PARAFUSO AC PHILLIPS CAB PAN M4 08MM (BICROMATIZADO) - PESO UN: 0,0015 KG' }],\n])\n\n`
  page = page.replace(adminAnchor, adminAnchor + migrationBlock)

  const oldNormalize = `function normalizeCarts(input: LuminaireCart[]) {\n  return input.map(cart => ({\n    ...cart,\n    sourceSheet: cart.sourceSheet || cart.nome,\n    items: (cart.items ?? []).map((item, index) => ({\n      ...item,\n      id: item.id ?? \`\${cart.id}-\${String(index + 1).padStart(3, '0')}-\${normalizeSearch(item.codigo)}\`\n    }))\n  }))\n}`

  const newNormalize = `function normalizeCarts(input: LuminaireCart[]) {\n  return input.map(cart => ({\n    ...cart,\n    sourceSheet: cart.sourceSheet || cart.nome,\n    items: (cart.items ?? []).map((sourceItem, index) => {\n      const replacement = cart.id === 'luminaria-948-920'\n        ? cart948920ReplacementByCode.get(normalizeSearch(sourceItem.codigo))\n        : undefined\n      const item = replacement ? { ...sourceItem, ...replacement } : sourceItem\n      return {\n        ...item,\n        id: item.id ?? \`\${cart.id}-\${String(index + 1).padStart(3, '0')}-\${normalizeSearch(item.codigo)}\`\n      }\n    })\n  }))\n}`

  if (!page.includes(oldNormalize)) throw new Error('Função normalizeCarts esperada não encontrada para aplicar a migração.')
  page = page.replace(oldNormalize, newNormalize)
  fs.writeFileSync(cartsPagePath, page)
  console.log('Migração de localStorage do 948/920 adicionada.')
  } else {
    console.log('Migração de localStorage do 948/920 já existe.')
  }
}

// 3) Informa no log quais dos novos códigos já existem na base inicial e suas localizações.
const seed = JSON.parse(fs.readFileSync(seedInventoryPath, 'utf8'))
const newCodes = [...new Set(Object.values(replacements).map(item => item.codigo))]
for (const code of newCodes) {
  const matches = seed.filter(record => {
    const candidates = [record.codigo, ...(Array.isArray(record.aliases) ? record.aliases : [])]
    return candidates.some(candidate => normalizeCode(candidate) === code)
  })
  if (!matches.length) {
    console.log(`[LOCALIZAÇÃO] ${code}: não encontrado na base inicial; o Carrinho continuará sincronizando registros existentes/adicionados no IndexedDB.`)
    continue
  }
  for (const match of matches) {
    console.log(`[LOCALIZAÇÃO] ${code}: ${match.bombona ?? 'sem bombona'} | ${match.endereco ?? 'sem endereço'}`)
  }
}

console.log('Atualização 948/920 validada.')
