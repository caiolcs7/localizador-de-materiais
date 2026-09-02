import { describe, expect, it } from 'vitest'
import type { LuminaireCart } from '../../types/cart'
import type { InventoryLocation } from '../../types/inventory'
import { findCartMemberships } from '../carts/cartLookup'
import { buildItemStatusRows } from './itemStatus'

const carts: LuminaireCart[] = [
  { id: 'a', nome: 'Luminária A', sourceSheet: 'A', items: [{ codigo: 'ABC123', descritivo: 'Material A' }, { codigo: 'ITTESTEAI4', descritivo: 'Material inox' }] },
  { id: 'b', nome: 'Luminária B', sourceSheet: 'B', items: [{ codigo: 'ABC123', descritivo: 'Material A' }, { codigo: 'SEMLOCAL01', descritivo: 'Material sem endereço' }] },
]

const location = (overrides: Partial<InventoryLocation>): InventoryLocation => ({
  id: crypto.randomUUID(),
  codigo: 'ABC123',
  codigoNormalizado: 'ABC123',
  bombona: 'R13B001',
  endereco: 'R13A1C01DP01',
  criadoEm: '2026-09-02T00:00:00.000Z',
  atualizadoEm: '2026-09-02T00:00:00.000Z',
  ...overrides,
})

describe('cart membership lookup', () => {
  it('lists every luminaire with an exact code and marks AI4/AI6 compatibility separately', () => {
    expect(findCartMemberships('ABC123', carts).map(item => item.cartName)).toEqual(['Luminária A', 'Luminária B'])
    expect(findCartMemberships('ITTESTEAI6', carts)).toMatchObject([
      { cartName: 'Luminária A', itemCode: 'ITTESTEAI4', match: 'equivalent' },
    ])
  })
})

describe('item status rows', () => {
  it('separates located codes, cart codes without location and empty addresses', () => {
    const inventory: InventoryLocation[] = [
      location({ id: 'located' }),
      location({ id: 'equivalent', codigo: 'ITTESTEAI6', codigoNormalizado: 'ITTESTEAI6', bombona: 'R13B002', endereco: 'R13A1C01DP01' }),
      location({ id: 'empty-vazio', codigo: 'VAZIO', codigoNormalizado: 'VAZIO', bombona: 'R13B003', endereco: 'R13A1C01DP01', registroTipo: 'sem_codigo', grupo: 'SEM_CODIGO' }),
      location({ id: 'empty-sem-codigo', codigo: 'SEM CÓDIGO', codigoNormalizado: 'SEMCÓDIGO', bombona: 'R13B004', endereco: 'R13A1C01DP01', registroTipo: 'sem_codigo', grupo: 'SEM_CODIGO' }),
    ]

    const rows = buildItemStatusRows(inventory, carts)
    expect(rows.filter(row => row.status === 'located')).toHaveLength(2)
    expect(rows.filter(row => row.status === 'empty')).toMatchObject([
      { codigo: 'SEM CÓDIGO', endereco: 'R13A1C01DP01' },
      { codigo: 'VAZIO', endereco: 'R13A1C01DP01' },
    ])
    expect(rows.filter(row => row.status === 'unlocated')).toMatchObject([
      { codigo: 'SEMLOCAL01', carts: ['Luminária B'], inventoryItem: null },
    ])
    expect(rows.some(row => row.status === 'unlocated' && row.codigo === 'ITTESTEAI4')).toBe(false)
  })
})
