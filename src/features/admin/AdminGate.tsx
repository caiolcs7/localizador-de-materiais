import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  BarChart3,
  Box,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  QrCode,
  Search,
} from 'lucide-react'
import { requireSupabase } from '../../lib/supabase'
import './admin.css'
import './admin-login-refresh.css'

type Props = {
  children: (session: Session, logout: () => Promise<void>) => ReactNode
}

type AdminLoginFormProps = {
  email: string
  password: string
  error: string
  busy: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}

const loginFeatures = [
  { icon: Search, title: 'BUSCA INTELIGENTE', description: 'Encontre itens em segundos' },
  { icon: Box, title: 'INVENTÁRIO PRECISO', description: 'Controle total de cada unidade' },
  { icon: QrCode, title: 'LEITURA DE CÓDIGO', description: 'Rastreamento QR/Barra' },
  { icon: BarChart3, title: 'RELATÓRIOS CLAROS', description: 'Otimize seus processos' },
] as const

function AdminBrandMark() {
  return (
    <div className="admin-login-mark" aria-hidden="true">
      <img
        src="/admin-company-logo.svg"
        alt=""
        width="336"
        height="360"
        decoding="async"
        draggable={false}
      />
    </div>
  )
}

function updateFeatureTilt(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch') return
  const bounds = event.currentTarget.getBoundingClientRect()
  const horizontal = (event.clientX - bounds.left) / bounds.width - .5
  const vertical = (event.clientY - bounds.top) / bounds.height - .5
  event.currentTarget.style.setProperty('--feature-tilt-x', `${(-vertical * 12).toFixed(2)}deg`)
  event.currentTarget.style.setProperty('--feature-tilt-y', `${(horizontal * 14).toFixed(2)}deg`)
}

function resetFeatureTilt(event: React.PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty('--feature-tilt-x')
  event.currentTarget.style.removeProperty('--feature-tilt-y')
}

export function AdminLoginForm({ email, password, error, busy, onEmailChange, onPasswordChange, onSubmit }: AdminLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return <div className="admin-login-page" role="main">
    <div className="admin-login-stage">
      <div className="admin-login-brand" role="banner" aria-label="Localizador de Materiais">
        <h1>Localizador de <span>Materiais</span></h1>
        <p>ORGANIZAÇÃO <i>•</i> EFICIÊNCIA <i>•</i> RESULTADOS</p>
      </div>

      <AdminBrandMark/>

      <aside className="admin-login-message admin-login-message-left" aria-hidden="true">
        <p>CONTROLE<br/>ORGANIZAÇÃO<br/>PRODUTIVIDADE</p>
        <span/>
      </aside>

      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-heading">
          <h2 id="admin-login-title">Bem-Vindo</h2>
          <p>Faça login para gerenciar seu estoque.</p>
        </div>

        <form className="admin-login-form" onSubmit={onSubmit} noValidate>
          <label className="admin-login-sr-only" htmlFor="admin-email">E-mail</label>
          <div className={`admin-login-field${email ? ' has-value' : ''}`}>
            <Mail className="admin-login-live-icon" size={19} aria-hidden="true"/>
            <input
              id="admin-email"
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={event => onEmailChange(event.target.value)}
              placeholder="Email"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
            />
          </div>

          <label className="admin-login-sr-only" htmlFor="admin-password">Senha</label>
          <div className={`admin-login-field${password ? ' has-value' : ''}${showPassword ? ' password-visible' : ''}`}>
            <LockKeyhole className="admin-login-live-icon" size={18} aria-hidden="true"/>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
              placeholder="Senha"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
            />
            <button
              className="admin-login-password-toggle"
              type="button"
              onClick={() => setShowPassword(current => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <Eye size={18}/> : <EyeOff size={18}/>}
            </button>
          </div>

          {error && <div className="admin-login-error" id="admin-login-error" role="alert">{error}</div>}

          <button
            className="admin-login-confirm"
            type="submit"
            disabled={busy}
            aria-label={busy ? 'Entrando' : 'Acessar plataforma'}
          >
            {busy
              ? <><span className="admin-login-spinner" aria-hidden="true"/><span>Acessando...</span></>
              : <><span>ACESSAR PLATAFORMA</span><ArrowRight size={17} aria-hidden="true"/></>}
          </button>
        </form>
      </section>

      <aside className="admin-login-message admin-login-message-right" aria-hidden="true">
        <p>CADA ITEM<br/>NO SEU LUGAR.<br/>SEMPRE.</p>
        <span/>
      </aside>

      <section className="admin-login-features" aria-label="Recursos do Localizador de Materiais">
        {loginFeatures.map(({ icon: Icon, title, description }) => <article
          className="admin-login-feature"
          key={title}
          onPointerMove={updateFeatureTilt}
          onPointerLeave={resetFeatureTilt}
        >
          <div className="admin-login-feature-icon" aria-hidden="true"><Icon/></div>
          <div className="admin-login-feature-copy">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </article>)}
      </section>

      <div className="admin-login-footer" role="contentinfo">
        ALMOXARIFADO INTEGRADO <b>|</b> LOCALIZADOR DE MATERIAIS PRO
      </div>
    </div>
  </div>
}

async function validateAdministrator(session: Session | null) {
  if (!session) return null
  const client = requireSupabase()
  const { data, error } = await client
    .from('admin_users')
    .select('user_id, active')
    .eq('user_id', session.user.id)
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return null
  return session
}

export function AdminGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const client = requireSupabase()
    let active = true
    void client.auth.getSession().then(async ({ data }) => {
      const valid = await validateAdministrator(data.session)
      if (!active) return
      if (data.session && !valid) await client.auth.signOut()
      setSession(valid)
      setChecking(false)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      if (!nextSession) setSession(null)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password) {
      setError('Preencha o e-mail e a senha.')
      return
    }

    setBusy(true)
    const client = requireSupabase()
    const { data, error: loginError } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (loginError || !data.session) {
      setError('E-mail ou senha inválidos.')
      setBusy(false)
      return
    }
    const valid = await validateAdministrator(data.session)
    if (!valid) {
      await client.auth.signOut()
      setError('Esta conta não possui acesso administrativo.')
      setBusy(false)
      return
    }
    setPassword('')
    setSession(valid)
    setBusy(false)
  }

  async function logout() {
    await requireSupabase().auth.signOut()
    setSession(null)
  }

  if (checking) return <div className="admin-loading"><span className="admin-loading-spinner" aria-hidden="true"/>Validando acesso administrativo…</div>
  if (session) return <>{children(session, logout)}</>

  return <AdminLoginForm
    email={email}
    password={password}
    error={error}
    busy={busy}
    onEmailChange={value=>{setEmail(value);setError('')}}
    onPasswordChange={value=>{setPassword(value);setError('')}}
    onSubmit={login}
  />
}
