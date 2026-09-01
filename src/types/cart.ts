export type CartItem = {
  id?: string
  codigo: string
  descritivo?: string | null
  quantidade?: number | null
  unidade?: string | null
  observacoes?: string | null
  categoria?: string | null
  linhaOrigem?: number | null
}

export type LuminaireCart = {
  id: string
  nome: string
  sourceSheet: string
  items: CartItem[]
}
