import type { RealtimeChannel } from '@supabase/supabase-js'
import { defaultCarts } from '../features/carts/cartData'
import { requireSupabase, supabase } from '../lib/supabase'
import type { CartItem, LuminaireCart } from '../types/cart'
import type { Database } from '../types/database'
import { normalizeSearch } from '../utils/normalize'

type CartRow = Database['public']['Tables']['luminaire_carts']['Row']
type CartItemRow = Database['public']['Tables']['cart_items']['Row']

const fromItemRow = (row: CartItemRow): CartItem => ({
  id: row.id,
  codigo: row.codigo,
  descritivo: row.descritivo,
  quantidade: row.quantidade,
  unidade: row.unidade,
  observacoes: row.observacoes,
  categoria: row.categoria,
  linhaOrigem: row.linha_origem,
  version: row.version,
})

export async function fetchCarts(): Promise<LuminaireCart[]> {
  if (!supabase) return defaultCarts
  const [{ data: carts, error: cartsError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('luminaire_carts').select('*').order('sort_order').order('nome'),
    supabase.from('cart_items').select('*').order('sort_order'),
  ])
  if (cartsError || itemsError) throw new Error('Não foi possível sincronizar os carrinhos.', { cause: cartsError ?? itemsError })
  const itemsByCart = new Map<string, CartItem[]>()
  for (const row of items) itemsByCart.set(row.cart_id, [...(itemsByCart.get(row.cart_id) ?? []), fromItemRow(row)])
  return carts.map((row: CartRow) => ({
    id: row.id,
    nome: row.nome,
    sourceSheet: row.source_sheet,
    sortOrder: row.sort_order,
    version: row.version,
    items: itemsByCart.get(row.id) ?? [],
  }))
}

export async function createCart(cart: LuminaireCart) {
  const { error } = await requireSupabase().from('luminaire_carts').insert({
    id: cart.id,
    nome: cart.nome.trim(),
    source_sheet: cart.sourceSheet.trim() || cart.nome.trim(),
    sort_order: cart.sortOrder ?? 0,
  })
  if (error) throw new Error('Não foi possível criar o carrinho.', { cause: error })
}

export async function updateCart(cart: LuminaireCart) {
  const client = requireSupabase()
  let request = client.from('luminaire_carts').update({ nome: cart.nome.trim(), source_sheet: cart.sourceSheet.trim() || cart.nome.trim() }).eq('id', cart.id)
  if (cart.version != null) request = request.eq('version', cart.version)
  const { data, error } = await request.select('id').maybeSingle()
  if (error) throw new Error('Não foi possível atualizar o carrinho.', { cause: error })
  if (!data) throw new Error('Este carrinho foi alterado por outra pessoa. Atualize e tente novamente.')
}

export async function removeCart(id: string) {
  const { error } = await requireSupabase().from('luminaire_carts').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir o carrinho.', { cause: error })
}

export async function saveCartItem(cartId: string, item: CartItem, sortOrder: number) {
  const client = requireSupabase()
  const payload = {
    cart_id: cartId,
    codigo: item.codigo.trim().toUpperCase(),
    codigo_normalizado: normalizeSearch(item.codigo),
    descritivo: item.descritivo ?? null,
    quantidade: item.quantidade ?? null,
    unidade: item.unidade ?? null,
    observacoes: item.observacoes ?? null,
    categoria: item.categoria ?? null,
    linha_origem: item.linhaOrigem ?? null,
    sort_order: sortOrder,
  }
  if (item.version != null) {
    const { data, error } = await client.from('cart_items').update(payload).eq('id', item.id!).eq('version', item.version).select('id').maybeSingle()
    if (error) throw new Error('Não foi possível atualizar o item do carrinho.', { cause: error })
    if (!data) throw new Error('Este item foi alterado por outra pessoa. Atualize e tente novamente.')
    return
  }
  const { error } = await client.from('cart_items').insert({ id: item.id ?? crypto.randomUUID(), ...payload })
  if (error) throw new Error('Não foi possível adicionar o item ao carrinho.', { cause: error })
}

export async function removeCartItem(id: string) {
  const { error } = await requireSupabase().from('cart_items').delete().eq('id', id)
  if (error) throw new Error('Não foi possível excluir o item do carrinho.', { cause: error })
}

export function subscribeToCarts(onChange: () => void | Promise<void>) {
  if (!supabase) return () => undefined
  const client = supabase
  let timer: ReturnType<typeof setTimeout> | null = null
  const refresh = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void onChange() }, 120)
  }
  const channel: RealtimeChannel = client
    .channel('carts-live-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'luminaire_carts' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, refresh)
    .subscribe()
  return () => {
    if (timer) clearTimeout(timer)
    void client.removeChannel(channel)
  }
}
