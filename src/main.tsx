import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AdminGate } from './features/admin/AdminGate'
import './status-enhancements.css'
import './calculator-container-icons.css'

declare global { interface Window { __LM_BOOT_OK__?: boolean } }
window.__LM_BOOT_OK__ = true

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
const adminServiceWorkerResetKey = 'lm-admin-sw-reset-v1'

async function releaseAdminFromServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  try {
    const wasControlled = Boolean(navigator.serviceWorker.controller)
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))

    if (wasControlled) {
      if (sessionStorage.getItem(adminServiceWorkerResetKey) !== '1') {
        sessionStorage.setItem(adminServiceWorkerResetKey, '1')
        window.location.reload()
      }
      return
    }

    sessionStorage.removeItem(adminServiceWorkerResetKey)
  } catch (error) {
    console.warn('Não foi possível liberar a rota administrativa do Service Worker.', error)
  }
}

if ('serviceWorker' in navigator) {
  if (isAdminRoute) {
    void releaseAdminFromServiceWorker()
  } else {
    registerSW({ immediate: true })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute
      ? <AdminGate>{(session, logout) => <App adminMode adminEmail={session.user.email} onLogout={logout}/>}</AdminGate>
      : <App/>}
  </StrictMode>,
)
