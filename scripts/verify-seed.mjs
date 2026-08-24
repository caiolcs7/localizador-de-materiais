import fs from 'node:fs'
const data=JSON.parse(fs.readFileSync(new URL('../src/data/seedInventory.json',import.meta.url),'utf8'))
const assert=(c,m)=>{if(!c)throw new Error(m)}
assert(data.length===633,`Esperado 633 registros; encontrado ${data.length}`)
assert(new Set(data.map(x=>x.id)).size===data.length,'IDs duplicados')
const loc=c=>data.filter(x=>x.codigo===c).map(x=>x.bombona).sort()
assert(loc('ITARLSM003BC').includes('R12B2'),'ITARLSM003BC/R12B2 ausente')
assert(JSON.stringify(loc('ITPFPHM408PAAI4'))===JSON.stringify(['R13B139','R13B54','R13B56'].sort()),'Localizações ITPFPHM408PAAI4 incorretas')
assert(loc('ITPFPHM410PAAI4').length===2,'ITPFPHM410PAAI4 deveria ter 2 localizações')
console.log(`OK: ${data.length} registros; IDs únicos; casos críticos validados.`)
