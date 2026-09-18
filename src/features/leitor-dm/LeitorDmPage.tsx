import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ClipboardList, ScanLine, Settings2, Wifi, WifiOff } from 'lucide-react'
import { db, initializeDatabase } from './core/database'
import { Home } from './features/sessions/Home'
import { SessionPage } from './features/sessions/SessionPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { Loading, NoticeProvider, errorMessage } from './components/ui'
import './leitor-dm.css'

type LeitorDmPageProps = { dark: boolean }

function LeitorDmApplication({ dark }: LeitorDmPageProps) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [route, setRoute] = useState('/')
  const [online, setOnline] = useState(() => navigator.onLine)
  const settings = useLiveQuery(() => db.settings.get('main'), [])

  useEffect(() => {
    let active = true
    void initializeDatabase()
      .then(() => { if (active) setReady(true) })
      .catch((cause) => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const navigate = (event: Event) => {
      const next = (event as CustomEvent<string>).detail
      if (typeof next === 'string' && next.startsWith('/')) {
        setRoute(next)
        document.querySelector('.leitor-dm-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    const network = () => setOnline(navigator.onLine)
    window.addEventListener('leitor-dm:navigate', navigate)
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    return () => {
      window.removeEventListener('leitor-dm:navigate', navigate)
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
    }
  }, [])

  const sessionMatch = /^\/session\/([^/]+)\/(scanner|records)$/.exec(route)

  return <section className="leitor-dm-root" data-theme={dark ? 'dark' : 'light'}>
    <div className="leitor-dm-topbar">
      <div className="leitor-dm-brand">
        <span className="leitor-dm-brand-mark"><ScanLine size={22}/></span>
        <span><strong>Leitor DM</strong><small>Levantamentos por Data Matrix</small></span>
      </div>
      <nav className="leitor-dm-nav" aria-label="Navegação do Leitor DM">
        <button className={route !== '/settings' ? 'active' : ''} onClick={() => setRoute('/')}>
          <ClipboardList size={17}/>Levantamentos
        </button>
        <button className={route === '/settings' ? 'active' : ''} onClick={() => setRoute('/settings')}>
          <Settings2 size={17}/>Configurações
        </button>
      </nav>
      <span className="leitor-dm-status">{online ? <Wifi size={15}/> : <WifiOff size={15}/>} {online ? 'Online' : 'Offline'}</span>
    </div>

    <div className="leitor-dm-shell">
      {error ? <div className="leitor-dm-error"><div><strong>Não foi possível abrir o Leitor DM</strong><p>{error}</p></div><button onClick={() => window.location.reload()}>Recarregar</button></div>
        : !ready || !settings ? <Loading text="Abrindo Leitor DM…"/>
        : sessionMatch ? <SessionPage key={sessionMatch[1]} id={sessionMatch[1]} view={sessionMatch[2]} settings={settings}/>
        : route === '/settings' ? <SettingsPage key={settings.id} settings={settings}/>
        : <Home settings={settings}/>}
    </div>
  </section>
}

export default function LeitorDmPage(props: LeitorDmPageProps) {
  return <NoticeProvider><LeitorDmApplication {...props}/></NoticeProvider>
}
