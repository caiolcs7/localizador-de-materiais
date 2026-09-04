import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { requireSupabase } from '../../lib/supabase'
import './admin.css'

type Props = {
  children: (session: Session, logout: () => Promise<void>) => ReactNode
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
    setBusy(true)
    const client = requireSupabase()
    const { data, error: loginError } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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

  if (checking) return <div className="admin-loading">Validando acesso administrativo…</div>
  if (session) return <>{children(session, logout)}</>

  return <main className="admin-login-page">
    <section className="admin-login-shell" aria-labelledby="admin-login-title">
      <form className="admin-login-form" onSubmit={login}>
        <div className="admin-login-title" id="admin-login-title">
          Bem-vindo!
          <span>Faça login para continuar.</span>
        </div>
        <label className="admin-login-field">
          <span>E-mail</span>
          <input autoFocus className="admin-login-input" type="email" autoComplete="username" required value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="E-mail"/>
        </label>
        <label className="admin-login-field">
          <span>Senha</span>
          <input className="admin-login-input" type="password" autoComplete="current-password" required minLength={8} maxLength={72} value={password} onChange={event => { setPassword(event.target.value); setError('') }} placeholder="Senha"/>
        </label>
        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <button className="admin-login-confirm" type="submit" disabled={busy} aria-label={busy ? 'Entrando' : 'Entrar'}>{busy ? <span>Entrando…</span> : <span aria-hidden="true">→</span>}</button>
      </form>
      <a href="/">Voltar para o Localizador público</a>
    </section>
  </main>
}
