import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AdminGate } from './features/admin/AdminGate'
import './status-enhancements.css'

declare global { interface Window { __LM_BOOT_OK__?: boolean } }
window.__LM_BOOT_OK__ = true
registerSW({ immediate: true })

const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute
      ? <AdminGate>{(session, logout) => <App adminMode adminEmail={session.user.email} onLogout={logout}/>}</AdminGate>
      : <App/>}
  </StrictMode>,
)
