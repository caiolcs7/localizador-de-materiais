import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { requireSupabase } from '../../lib/supabase'

type Administrator = {
  user_id: string
  email: string
  active: boolean
  created_at: string
}

export function AdminUsersPanel() {
  const [administrators, setAdministrators] = useState<Administrator[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error: listError } = await requireSupabase()
      .from('admin_users')
      .select('user_id, email, active, created_at')
      .order('created_at')
    if (listError) throw new Error('Não foi possível listar os administradores.', { cause: listError })
    setAdministrators(data)
  }, [])

  useEffect(() => { void refresh().catch(currentError => setError(currentError instanceof Error ? currentError.message : 'Não foi possível listar os administradores.')) }, [refresh])

  async function addAdministrator(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    const { error: invokeError } = await requireSupabase().functions.invoke('admin-users', {
      body: { email: email.trim().toLowerCase(), password },
    })
    if (invokeError) {
      let text = 'Não foi possível cadastrar o administrador.'
      try {
        const payload = await invokeError.context.json() as { error?: string }
        if (payload.error) text = payload.error
      } catch { /* resposta sem JSON */ }
      setError(text)
      setBusy(false)
      return
    }
    setEmail('')
    setPassword('')
    setMessage('Administrador cadastrado com sucesso.')
    await refresh()
    setBusy(false)
  }

  return <section className="admin-users-card">
    <div className="admin-users-heading"><div><ShieldCheck size={20}/><span><b>Administradores</b><small>Contas autorizadas a editar o sistema.</small></span></div><em>{administrators.filter(item => item.active).length} ativo(s)</em></div>
    <div className="admin-users-list">{administrators.map(administrator => <div key={administrator.user_id}><span><b>{administrator.email}</b><small>Cadastrado em {new Intl.DateTimeFormat('pt-BR').format(new Date(administrator.created_at))}</small></span><em className={administrator.active ? 'active' : ''}>{administrator.active ? 'Ativo' : 'Inativo'}</em></div>)}</div>
    <form className="admin-user-form" onSubmit={addAdministrator}>
      <div><b>Adicionar acesso</b><small>A senha é armazenada de forma segura pelo serviço de autenticação e nunca fica visível depois do cadastro.</small></div>
      <label>Novo e-mail<input type="email" autoComplete="off" required value={email} onChange={event => { setEmail(event.target.value); setError(''); setMessage('') }}/></label>
      <label>Senha inicial<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => { setPassword(event.target.value); setError(''); setMessage('') }}/><small>De 8 a 72 caracteres, com letra, número e símbolo.</small></label>
      {error && <div className="admin-login-error" role="alert">{error}</div>}
      {message && <div className="admin-form-success" role="status">{message}</div>}
      <button className="primary-button" type="submit" disabled={busy}><UserPlus size={16}/>{busy ? 'Cadastrando…' : 'Adicionar administrador'}</button>
    </form>
  </section>
}
