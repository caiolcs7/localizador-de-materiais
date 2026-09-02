import { Box3, Mesh, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { buildErjModel } from './ErjModel3D'

describe('modelo 3D da ERJ', () => {
  it('constrói o conjunto completo com proporções coerentes', () => {
    const model = buildErjModel()
    const meshes = model.children.filter(child => child instanceof Mesh)
    const size = new Box3().setFromObject(model).getSize(new Vector3())

    expect(model.name).toContain('ERJ')
    expect(meshes.length).toBeGreaterThan(140)
    expect(size.x).toBeGreaterThan(4)
    expect(size.y).toBeGreaterThan(4)
    expect(size.z).toBeGreaterThan(2)
  })
})
