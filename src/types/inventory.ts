export interface InventoryLocation {
  id: string
  codigo: string
  codigoOriginal?: string | null
  codigoNormalizado: string
  aliases?: string[]
  bombona: string
  endereco: string
  enderecoOriginal?: string | null
  rua?: string | null
  descritivo?: string | null
  quantidade?: number | null
  observacoes?: string | null
  grupo?: string | null
  arquivoOrigem?: string | null
  registroTipo?: string | null
  criadoEm: string
  atualizadoEm: string
}

export type ItemDraft = Omit<InventoryLocation, 'id' | 'codigoNormalizado' | 'criadoEm' | 'atualizadoEm'> & {
  id?: string
}

export type SearchKind = 'exact' | 'equivalent' | 'bombona' | 'endereco' | 'prefix' | 'contains' | 'suggestion'
export interface SearchResult { kind: SearchKind; items: InventoryLocation[]; suggestion?: string }
