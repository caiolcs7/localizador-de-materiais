import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './status-enhancements.css'

declare global { interface Window { __LM_BOOT_OK__?: boolean } }
window.__LM_BOOT_OK__ = true
registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
