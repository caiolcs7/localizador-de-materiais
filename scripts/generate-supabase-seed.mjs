import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const normalize = value => String(value ?? '').trim().toUpperCase().replace(/[\s._\-/]+/g, '')
const formatBombona = value => String(value ?? '').trim().toUpperCase().replace(/B(\d{1,3})(?!\d)/g, (_match, digits) => `B${digits.padStart(3, '0')}`)
const sqlText = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`
const sqlNumber = value => value == null || value === '' ? 'null' : String(Number(value))
const sqlBoolean = value => value ? 'true' : 'false'
const sqlArray = values => !Array.isArray(values) || values.length === 0
  ? 'array[]::text[]'
  : `array[${values.map(sqlText).join(', ')}]::text[]`

const inventoryById = new Map()
for (const record of [
  ...readJson('src/data/seedInventory.json'),
  ...readJson('src/data/moniqueAdditions.json'),
]) {
  inventoryById.set(record.id, {
    ...record,
    codigo: String(record.codigo).trim().toUpperCase(),
    codigoNormalizado: normalize(record.codigo),
    bombona: formatBombona(record.bombona),
    endereco: String(record.endereco).trim().toUpperCase(),
  })
}

const replacement948920 = new Map([
  ['ITARLSM004AC', { codigo: 'ITARLSM004BC', descritivo: 'ARRUELA AC BICROMATIZADO LISA M4 - PESO UN: 0,00029 KG' }],
  ['ITARPRM04AC', { codigo: 'ITARPRM04BC', descritivo: 'ARRUELA AC BICROMATIZADO PRESSAO M4 - PESO UN: 0,00018 KG' }],
  ['ITPFPHM510PAAC', { codigo: 'ITPFPHM510PABC', descritivo: 'PARAFUSO AC PHILLIPS AC CAB PAN M5 10MM (BICROMATIZADO) - PESO UN: 0,00276 KG' }],
  ['ITPFPHM408PAAC', { codigo: 'ITPFPHM408PABC', descritivo: 'PARAFUSO AC PHILLIPS CAB PAN M4 08MM (BICROMATIZADO) - PESO UN: 0,0015 KG' }],
])

const cartSources = [
  ...readJson('src/data/cartsData.json'),
  readJson('src/data/cart016017.json'),
  readJson('src/data/cartGHB.json'),
  readJson('src/data/cartERV.json'),
]

const carts = cartSources.map((cart, cartIndex) => ({
  ...cart,
  sortOrder: cartIndex,
  sourceSheet: cart.sourceSheet || cart.nome,
  items: (cart.items ?? []).map((sourceItem, itemIndex) => {
    const replacement = cart.id === 'luminaria-948-920'
      ? replacement948920.get(normalize(sourceItem.codigo))
      : undefined
    const item = replacement ? { ...sourceItem, ...replacement } : sourceItem
    return {
      ...item,
      id: item.id ?? `${cart.id}-${String(itemIndex + 1).padStart(3, '0')}-${normalize(item.codigo)}`,
      codigo: String(item.codigo).trim().toUpperCase(),
      codigoNormalizado: normalize(item.codigo),
      sortOrder: itemIndex,
    }
  }),
}))

const inventoryValues = [...inventoryById.values()].map(record => `(
  ${sqlText(record.id)}::uuid,
  ${sqlText(record.codigo)},
  ${sqlText(record.codigoOriginal)},
  ${sqlText(record.codigoNormalizado)},
  ${sqlArray(record.aliases)},
  ${sqlText(record.bombona)},
  ${sqlText(record.endereco)},
  ${sqlText(record.enderecoOriginal)},
  ${sqlText(record.rua)},
  ${sqlText(record.descritivo)},
  ${sqlNumber(record.quantidade)},
  ${sqlText(record.observacoes)},
  ${sqlText(record.grupo)},
  ${sqlText(record.arquivoOrigem)},
  ${sqlText(record.registroTipo)},
  ${sqlBoolean(false)},
  ${sqlText(record.criadoEm)}::timestamptz,
  ${sqlText(record.atualizadoEm)}::timestamptz
)`).join(',\n')

const cartValues = carts.map(cart => `(
  ${sqlText(cart.id)},
  ${sqlText(cart.nome)},
  ${sqlText(cart.sourceSheet)},
  ${cart.sortOrder}
)`).join(',\n')

const cartItemValues = carts.flatMap(cart => cart.items.map(item => `(
  ${sqlText(item.id)},
  ${sqlText(cart.id)},
  ${sqlText(item.codigo)},
  ${sqlText(item.codigoNormalizado)},
  ${sqlText(item.descritivo)},
  ${sqlNumber(item.quantidade)},
  ${sqlText(item.unidade)},
  ${sqlText(item.observacoes)},
  ${sqlText(item.categoria)},
  ${sqlNumber(item.linhaOrigem)},
  ${item.sortOrder}
)`)).join(',\n')

const output = `-- Generated from the versioned application seed files. Do not edit manually.\n` +
`begin;\n\n` +
`insert into public.inventory_locations (\n` +
`  id, codigo, codigo_original, codigo_normalizado, aliases, bombona, endereco,\n` +
`  endereco_original, rua, descritivo, quantidade, observacoes, grupo,\n` +
`  arquivo_origem, registro_tipo, duplicate_override, created_at, updated_at\n` +
`) values\n${inventoryValues}\n` +
`on conflict (id) do update set\n` +
`  codigo = excluded.codigo, codigo_original = excluded.codigo_original,\n` +
`  codigo_normalizado = excluded.codigo_normalizado, aliases = excluded.aliases,\n` +
`  bombona = excluded.bombona, endereco = excluded.endereco,\n` +
`  endereco_original = excluded.endereco_original, rua = excluded.rua,\n` +
`  descritivo = excluded.descritivo, quantidade = excluded.quantidade,\n` +
`  observacoes = excluded.observacoes, grupo = excluded.grupo,\n` +
`  arquivo_origem = excluded.arquivo_origem, registro_tipo = excluded.registro_tipo;\n\n` +
`insert into public.luminaire_carts (id, nome, source_sheet, sort_order) values\n${cartValues}\n` +
`on conflict (id) do update set\n` +
`  nome = excluded.nome, source_sheet = excluded.source_sheet, sort_order = excluded.sort_order;\n\n` +
`insert into public.cart_items (\n` +
`  id, cart_id, codigo, codigo_normalizado, descritivo, quantidade, unidade,\n` +
`  observacoes, categoria, linha_origem, sort_order\n` +
`) values\n${cartItemValues}\n` +
`on conflict (id) do update set\n` +
`  cart_id = excluded.cart_id, codigo = excluded.codigo,\n` +
`  codigo_normalizado = excluded.codigo_normalizado, descritivo = excluded.descritivo,\n` +
`  quantidade = excluded.quantidade, unidade = excluded.unidade,\n` +
`  observacoes = excluded.observacoes, categoria = excluded.categoria,\n` +
`  linha_origem = excluded.linha_origem, sort_order = excluded.sort_order;\n\n` +
`commit;\n`

const outputPath = resolve(root, 'supabase/seed.sql')
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, output)
console.log(`Generated ${outputPath} with ${inventoryById.size} inventory records, ${carts.length} carts and ${carts.reduce((total, cart) => total + cart.items.length, 0)} cart items.`)
