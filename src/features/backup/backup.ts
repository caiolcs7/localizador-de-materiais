import { requireSupabase } from '../../lib/supabase'
import { getAllLocations, syncInventory } from '../../services/inventoryService'
import type { InventoryLocation } from '../../types/inventory'
import { formatBombona, inferRua, normalizeSearch } from '../../utils/normalize'

export async function exportBackup() {
  const data = await getAllLocations()
  download(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: data }, null, 2), `localizador-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json')
}

export async function importBackup(file: File) {
  const parsed = JSON.parse(await file.text()) as { records?: InventoryLocation[] }
  if (!Array.isArray(parsed.records)) throw new Error('Backup inválido: lista de registros ausente.')
  if (parsed.records.length > 10000) throw new Error('Backup inválido: o limite é de 10.000 registros.')
  if (!parsed.records.every(r => r && typeof r.id === 'string' && typeof r.codigo === 'string' && typeof r.bombona === 'string' && typeof r.endereco === 'string')) throw new Error('Backup inválido: há registros malformados.')

  const normalized = parsed.records.map(r => {
    const bombona = formatBombona(r.bombona)
    return {
      ...r,
      codigoNormalizado: normalizeSearch(r.codigo),
      bombona,
      rua: inferRua(bombona)
    }
  })

  const rows = normalized.map(record => ({
    id: record.id,
    codigo: record.codigo.trim().toUpperCase(),
    codigo_original: record.codigoOriginal ?? null,
    codigo_normalizado: record.codigoNormalizado,
    aliases: record.aliases ?? [],
    bombona: record.bombona,
    endereco: record.endereco.trim().toUpperCase(),
    endereco_original: record.enderecoOriginal ?? null,
    rua: record.rua ?? null,
    descritivo: record.descritivo ?? null,
    quantidade: record.quantidade ?? null,
    observacoes: record.observacoes ?? null,
    grupo: record.grupo ?? null,
    arquivo_origem: record.arquivoOrigem ?? null,
    registro_tipo: record.registroTipo ?? 'material',
    duplicate_override: record.duplicateOverride ?? false,
  }))
  const client = requireSupabase()
  for (let start = 0; start < rows.length; start += 250) {
    const { error } = await client.from('inventory_locations').upsert(rows.slice(start, start + 250), { onConflict: 'id' })
    if (error) throw new Error(`Não foi possível importar o lote ${Math.floor(start / 250) + 1}. Nenhum registro foi apagado.`, { cause: error })
  }
  await syncInventory()
  return normalized.length
}

export async function exportCSV() {
  const rows = await getAllLocations()
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = ['Código;Bombona;Endereço;Descritivo;Quantidade;Observações', ...rows.map(r => [r.codigo,r.bombona,r.endereco,r.descritivo ?? '',r.quantidade ?? '',r.observacoes ?? ''].map(esc).join(';'))]
  download('\ufeff' + lines.join('\n'), 'localizador-materiais.csv', 'text/csv;charset=utf-8')
}

function download(content: string, name: string, type: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
