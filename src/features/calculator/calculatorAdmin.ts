const ADMIN_SESSION_KEY = 'bombonacalc_admin_expira_em'
const ADMIN_PIN_HASH = '7e66b5dd3d158d14ba3300cad5702ee6d72befaec37890eed25c91687bb649df'
export const ADMIN_SESSION_DURATION_MS = 10 * 60 * 1000

type SessionStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getSessionStorage(): SessionStorageAdapter | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function validateCalculatorAdminPin(pin: string): Promise<boolean> {
  if (!globalThis.crypto?.subtle) return String(pin) === '3007'
  return (await sha256(String(pin))) === ADMIN_PIN_HASH
}

export function openCalculatorAdminSession(storage = getSessionStorage()): void {
  storage?.setItem(ADMIN_SESSION_KEY, String(Date.now() + ADMIN_SESSION_DURATION_MS))
}

export function closeCalculatorAdminSession(storage = getSessionStorage()): void {
  storage?.removeItem(ADMIN_SESSION_KEY)
}

export function isCalculatorAdminSessionActive(storage = getSessionStorage()): boolean {
  const expiresAt = Number(storage?.getItem(ADMIN_SESSION_KEY))
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    closeCalculatorAdminSession(storage)
    return false
  }
  return true
}
