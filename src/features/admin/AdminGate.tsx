import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LockKeyhole, LogIn } from 'lucide-react'
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
    <section className="admin-login-card" aria-labelledby="admin-login-title">
      <div className="admin-login-mark"><LockKeyhole size={25}/></div>
      <div className="admin-login-copy">
        <span>ÁREA RESTRITA</span>
        <h1 id="admin-login-title">Administração do Localizador</h1>
        <p>Entre com uma conta autorizada para cadastrar e editar materiais, carrinhos e usuários.</p>
      </div>
      <form onSubmit={login}>
        <label>E-mail<input autoFocus type="email" autoComplete="username" required value={email} onChange={event => { setEmail(event.target.value); setError('') }} placeholder="seu@email.com"/></label>
        <label>Senha<input type="password" autoComplete="current-password" required minLength={8} maxLength={72} value={password} onChange={event => { setPassword(event.target.value); setError('') }}/></label>
        {error && <div className="admin-login-error" role="alert">{error}</div>}
        <button className="primary-button" type="submit" disabled={busy}><LogIn size={17}/>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <a href="/">Voltar para o Localizador público</a>
    </section>
  </main>
}
