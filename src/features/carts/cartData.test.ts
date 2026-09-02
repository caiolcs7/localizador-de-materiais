import { describe, expect, it } from 'vitest'
import type { LuminaireCart } from '../../types/cart'
import { cart016017Id, defaultCarts, loadCurrentCarts } from './cartData'

describe('cart default data and migration', () => {
  it('ships 016/017 with its ten photographed materials', () => {
    const cart = defaultCarts.find(item => item.id === cart016017Id)
    expect(cart).toMatchObject({ nome: '016/017', sourceSheet: 'Luminária 016/017' })
    expect(cart?.items).toHaveLength(10)
    expect(cart?.items.map(item => item.codigo)).toEqual([
      'ITPFPHM508PABC',
      'ITARLSM006BC',
      'ITPFPHM506ESBC',
      'ITARLSM005BC',
      'ITPFPHM416PABC',
      'ITPRCSEM03BC',
      'ITARLSM003AI4',
      'ITPFPHM310PAAI4',
      'ITPRCSEM03AI4',
      'ITARSRM003AI6',
    ])
  })

  it('adds 016/017 once to data saved before this release', () => {
    const oldCart: LuminaireCart = { id: 'existing', nome: 'Existente', sourceSheet: 'Existente', items: [] }
    const migrated = loadCurrentCarts(JSON.stringify([oldCart]), false)
    expect(migrated.map(cart => cart.id)).toEqual(['existing', cart016017Id])

    const afterUserDeletion = loadCurrentCarts(JSON.stringify([oldCart]), true)
    expect(afterUserDeletion.map(cart => cart.id)).toEqual(['existing'])
  })
})
