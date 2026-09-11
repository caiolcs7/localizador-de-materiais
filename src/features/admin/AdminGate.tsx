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
  return <div className="admin-login-mark" aria-hidden="true">
    <svg viewBox="0 0 168 190" role="img">
      <defs>
        <linearGradient id="admin-purple" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b56be7"/>
          <stop offset=".48" stopColor="#6730bb"/>
          <stop offset="1" stopColor="#30136d"/>
        </linearGradient>
        <linearGradient id="admin-orange" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffc85b"/>
          <stop offset=".48" stopColor="#f28c17"/>
          <stop offset="1" stopColor="#c55d08"/>
        </linearGradient>
      </defs>
      <path d="M81 4 8 47v91l73 43V94L43 72l38-22z" fill="url(#admin-purple)" stroke="#17243a" strokeWidth="4"/>
      <path d="m87 4 73 43v91l-73 43V94l38-22-38-22z" fill="url(#admin-orange)" stroke="#17243a" strokeWidth="4"/>
      <path d="m81 4 6 0 73 43-37 22-39-23-39 23L8 47z" fill="none" stroke="#e5d9ee" strokeOpacity=".5" strokeWidth="3"/>
      <path d="M8 47 81 90v91L8 138zM160 47 87 90v91l73-43z" fill="none" stroke="#101e35" strokeWidth="5"/>
      <path d="M22 57 78 90 56 103 21 82zm0 36 31 18v37l-31-18zm125-36-56 33 22 13 35-21zm0 36-31 18v37l31-18z" fill="none" stroke="#17233a" strokeWidth="4"/>
      <path d="M73 109 53 97 32 109v28l21 12 20-12v-13l-15 8-10-6v-7l10-6 15 8zm22 0 20-12 21 12v28l-21 12-20-12v-13l15 8 10-6v-7l-10-6-15 8z" fill="none" stroke="#1a2740" strokeWidth="5"/>
      <path d="M81 8v76M87 8v76" stroke="#e3d9eb" strokeOpacity=".42" strokeWidth="2"/>
    </svg>
  </div>
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

          <div className="admin-login-links" aria-label="Ajuda de acesso">
            <span>Esqueceu a senha?</span>
            <span>Não tem conta? <u>Solicitar acesso.</u></span>
          </div>
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
        ALMOXARIFADO INTEGRADO <b>|</b> LOCALIZADOR DE MATERIAIS PRO © 2024
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
