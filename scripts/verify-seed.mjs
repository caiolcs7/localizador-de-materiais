import fs from 'node:fs'

const seed = JSON.parse(fs.readFileSync(new URL('../src/data/seedInventory.json', import.meta.url), 'utf8'))
const monique = JSON.parse(fs.readFileSync(new URL('../src/data/moniqueAdditions.json', import.meta.url), 'utf8'))
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const normalizeCode = value => String(value ?? '').trim().toUpperCase().replace(/[\s._\-\/]+/g, '')
const formatBombona = value => String(value ?? '').trim().toUpperCase().replace(/B(\d{1,3})(?!\d)/g, (_m, digits) => `B${digits.padStart(3, '0')}`)
const codes = record => new Set([record.codigo, ...(record.aliases ?? [])].map(normalizeCode))
const covers = (record, code, bombona) => formatBombona(record.bombona) === formatBombona(bombona) && codes(record).has(normalizeCode(code))

assert(seed.length === 633, `Esperado 633 registros-base; encontrado ${seed.length}`)
assert(new Set(seed.map(x => x.id)).size === seed.length, 'IDs duplicados na base original')
assert(monique.length === 18, `Esperado 18 registros Monique; encontrado ${monique.length}`)
assert(new Set(monique.map(x => x.id)).size === monique.length, 'IDs duplicados nos registros Monique')
assert(monique.every(x => x.descritivo === 'Salvo Por Monique'), 'Descritivo dos registros Monique está incorreto')
assert(monique.every(x => /^R\d+B\d{3}S?$/.test(x.bombona)), 'Há bombona Monique fora do padrão de 3 dígitos')
assert(monique.every(x => x.endereco === 'N/T'), 'Endereço desconhecido deve permanecer N/T')

for (const item of monique) {
  assert(!seed.some(existing => covers(existing, item.codigo, item.bombona)), `Registro Monique já existia na base: ${item.codigo} | ${item.bombona}`)
}

const expectedWorkbookPairs = [
  ['ITARLEM04AI','R13B005S'],
  ['ITARLSM003AI4','R13B043'],
  ['ITARLSM003AI4','R13B045'],
  ['ITARLSM003BC','R13B002'],
  ['ITARLSM004AI6','R13B011S'],
  ['ITARLSM004BC','R13B004S'],
  ['ITARLSM005AI6','R12B048'],
  ['ITARLSM006AI6','R13B034'],
  ['ITARPRM05AI4','R13B229'],
  ['ITARPRM05AI6','R13B229'],
  ['ITARSRM003AI4','R13B009S'],
  ['ITARSRM003BC','R13B001S'],
  ['ITARSRM005AI4','R13B012S'],
  ['ITARSRM005AI4','R13B220'],
  ['ITLAVF0051','R13B002S'],
  ['ITPFPH3913AEAI4','R13B003S'],
  ['ITPFPH3913APBC','R13B008S'],
  ['ITPFPH4213AEBC','R12B041'],
  ['ITPFPH4222AEAI4','R14B048'],
  ['ITPFPHM310PAAI4','R12B040'],
  ['ITPFPHM310PABC','R14B052'],
  ['ITPFPHM406ESAI4','R14B021'],
  ['ITPFPHM406ESBC','R12B017'],
  ['ITPFPHM408PAAI4','R13B054'],
  ['ITPFPHM408PABC','R13B007S'],
  ['ITPFPHM410PAAI6','R12B051'],
  ['ITPFPHM416PAAI4','R13B013S'],
  ['ITPFPHM420PAAI4','R14B073'],
  ['ITPFPHM430PAAI4','R13B145'],
  ['ITPFPHM510PAAI4','R13B014S'],
  ['ITPFPHM525PAAI4','R13B160'],
  ['ITPFPHM530PAAI4','R13B172'],
  ['ITPRCSEM03AI4','R13B006S'],
  ['ITPRCSEM03AI6','R13B010S'],
  ['ITPRCSEM04AI4','R13B256'],
  ['ITPRCSEM05AI4','R14B087'],
  ['ITRKCHAB001','R13B075'],
  ['ITTEOL00009','R15B010'],
  ['ITTEOL00010','R15B012']
]

assert(expectedWorkbookPairs.length === 39, 'A lista de conferência da planilha deve ter 39 combinações únicas')
const combined = [...seed, ...monique]
for (const [code, bombona] of expectedWorkbookPairs) {
  assert(combined.some(record => covers(record, code, bombona)), `Planilha não coberta: ${code} | ${bombona}`)
}

const loc = code => seed.filter(x => x.codigo === code).map(x => x.bombona).sort()
assert(loc('ITARLSM003BC').includes('R12B2'), 'ITARLSM003BC/R12B2 original ausente')
assert(JSON.stringify(loc('ITPFPHM408PAAI4')) === JSON.stringify(['R13B139','R13B54','R13B56'].sort()), 'Localizações ITPFPHM408PAAI4 incorretas')
assert(loc('ITPFPHM410PAAI4').length === 2, 'ITPFPHM410PAAI4 deveria ter 2 localizações')

console.log(`OK: 633 registros-base + 18 Monique; 39 combinações da planilha conferidas; IDs únicos; bombonas e descrições validadas.`)
