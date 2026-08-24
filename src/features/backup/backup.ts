import { db } from '../../db/database'
import type { InventoryLocation } from '../../types/inventory'

export async function exportBackup() {
  const data = await db.locations.toArray()
  download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: data }, null, 2), `localizador-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json')
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as { records?: InventoryLocation[] }
  if (!Array.isArray(parsed.records)) throw new Error('Backup inválido: lista de registros ausente.')
  if (!parsed.records.every(r => r && typeof r.id === 'string' && typeof r.codigo === 'string' && typeof r.bombona === 'string' && typeof r.endereco === 'string')) throw new Error('Backup inválido: há registros malformados.')
  await db.transaction('rw', db.locations, async () => { await db.locations.clear(); await db.locations.bulkPut(parsed.records!) })
  return parsed.records.length
}

export async function exportCSV() {
  const rows = await db.locations.toArray()
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['Código;Bombona;Endereço;Descritivo;Quantidade;Observações', ...rows.map(r => [r.codigo,r.bombona,r.endereco,r.descritivo ?? '',r.quantidade ?? '',r.observacoes ?? ''].map(esc).join(';'))]
  download('\ufeff' + lines.join('\n'), 'localizador-materiais.csv', 'text/csv;charset=utf-8')
}

function download(content: string, name: string, type: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
