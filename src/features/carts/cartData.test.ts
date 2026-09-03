import { describe, expect, it } from 'vitest'
import type { LuminaireCart } from '../../types/cart'
import { cart016017Id, cartErvId, cartGhbId, defaultCarts, loadCurrentCarts } from './cartData'

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

  it('ships GHB with the 23 unique photographed codes', () => {
    const cart = defaultCarts.find(item => item.id === cartGhbId)
    const codes = cart?.items.map(item => item.codigo) ?? []

    expect(cart).toMatchObject({ nome: 'Luminária GHB', sourceSheet: 'Luminária GHB' })
    expect(codes).toHaveLength(23)
    expect(new Set(codes).size).toBe(23)
    expect(codes).toEqual([
      'ITPFALLM520AI4',
      'ITPFALLM516AI4',
      'ITPFPHM516PAAI6',
      'ITPFPHM408ESAI6',
      'ITPFPHM310PAAI4',
      'ITPFPHM406PAAI4',
      'ITPFPHM306PAAI4',
      'ITPFPHM408PAAI4',
      'ITPFPHM410PAAI4',
      'ITLGHB00078',
      'ITARLEM03AI4',
      'ITARLSM005AI6',
      'ITARLSM004AI6',
      'ITARLSM003AI4',
      'ITPFPHM310ESAI6',
      'ITPRCSEM03AI4',
      'ITARSRM004AI6',
      'ITARSRM003AI6',
      'ITARPRM04AI6',
      'ITTEPI00010',
      'ITTEOL00003',
      'ITARPRM05AI4',
      'ITPFPHM408PAAI6',
    ])
  })

  it('ships ERV with the 18 unique photographed codes', () => {
    const cart = defaultCarts.find(item => item.id === cartErvId)
    const codes = cart?.items.map(item => item.codigo) ?? []

    expect(cart).toMatchObject({ nome: 'Luminária ERV', sourceSheet: 'Luminária ERV' })
    expect(codes).toHaveLength(18)
    expect(new Set(codes).size).toBe(18)
    expect(codes).toEqual([
      'ITRKCHFE001',
      'ITARLSM008AI6',
      'ITTEOL00010',
      'ITPFPHM535CIAI4',
      'ITPFPHM306PAAI4',
      'ITPFPHM410PAAI4',
      'ITPFALLM520AI4',
      'ITARLSM005AI6',
      'ITPFPHM406PAAI6',
      'ITPFALLM412AI4',
      'ITPFALLM416AI4',
      'ITRKCHAB001',
      'ITPFALLM418AI4',
      'ITRKCHFE013',
      'ITPFSEM620BC',
      'ITPFSEM820BC',
      'ITARPRM10BC',
      'ITARLSM010BC',
    ])
  })

  it('adds 016/017 once to data saved before this release', () => {
    const oldCart: LuminaireCart = { id: 'existing', nome: 'Existente', sourceSheet: 'Existente', items: [] }
    const migrated = loadCurrentCarts(JSON.stringify([oldCart]), false, true, true)
    expect(migrated.map(cart => cart.id)).toEqual(['existing', cart016017Id])

    const afterUserDeletion = loadCurrentCarts(JSON.stringify([oldCart]), true, true, true)
    expect(afterUserDeletion.map(cart => cart.id)).toEqual(['existing'])
  })

  it('adds GHB once to data saved before this release', () => {
    const oldCart: LuminaireCart = { id: 'existing', nome: 'Existente', sourceSheet: 'Existente', items: [] }
    const migrated = loadCurrentCarts(JSON.stringify([oldCart]), true, false, true)
    expect(migrated.map(cart => cart.id)).toEqual(['existing', cartGhbId])

    const afterUserDeletion = loadCurrentCarts(JSON.stringify([oldCart]), true, true, true)
    expect(afterUserDeletion.map(cart => cart.id)).toEqual(['existing'])
  })

  it('adds ERV once to data saved before this release', () => {
    const oldCart: LuminaireCart = { id: 'existing', nome: 'Existente', sourceSheet: 'Existente', items: [] }
    const migrated = loadCurrentCarts(JSON.stringify([oldCart]), true, true, false)
    expect(migrated.map(cart => cart.id)).toEqual(['existing', cartErvId])

    const afterUserDeletion = loadCurrentCarts(JSON.stringify([oldCart]), true, true, true)
    expect(afterUserDeletion.map(cart => cart.id)).toEqual(['existing'])
  })
})
