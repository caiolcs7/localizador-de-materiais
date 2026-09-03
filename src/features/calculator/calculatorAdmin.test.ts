import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_SESSION_DURATION_MS,
  closeCalculatorAdminSession,
  isCalculatorAdminSessionActive,
  openCalculatorAdminSession,
  validateCalculatorAdminPin,
} from './calculatorAdmin'

class MemorySessionStorage {
  private data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, String(value)) }
  removeItem(key: string) { this.data.delete(key) }
}

describe('calculatorAdmin', () => {
  afterEach(() => vi.restoreAllMocks())

  it('aceita somente o PIN administrativo enviado com a calculadora', async () => {
    await expect(validateCalculatorAdminPin('3007')).resolves.toBe(true)
    await expect(validateCalculatorAdminPin('3008')).resolves.toBe(false)
  })

  it('expira a sessão administrativa após dez minutos', () => {
    const storage = new MemorySessionStorage()
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    openCalculatorAdminSession(storage)
    expect(isCalculatorAdminSessionActive(storage)).toBe(true)
    vi.spyOn(Date, 'now').mockReturnValue(1_000 + ADMIN_SESSION_DURATION_MS + 1)
    expect(isCalculatorAdminSessionActive(storage)).toBe(false)
    closeCalculatorAdminSession(storage)
  })
})
