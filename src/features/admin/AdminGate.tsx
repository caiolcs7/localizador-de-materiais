import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
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

export function AdminLoginForm({ email, password, error, busy, onEmailChange, onPasswordChange, onSubmit }: AdminLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return <div className="admin-login-page" role="main">
    <div className="admin-login-artboard" aria-hidden="true"/>

    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-heading admin-login-sr-only">
        <h1>Localizador de Materiais</h1>
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

        <div className="admin-login-links admin-login-sr-only" aria-label="Ajuda de acesso">
          <span>Esqueceu a senha?</span>
          <span>Não tem conta? <u>Solicitar acesso.</u></span>
        </div>
      </form>
    </section>
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
