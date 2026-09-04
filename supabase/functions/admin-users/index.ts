import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.115.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const validPassword = (password: string) =>
  password.length >= 8 &&
  password.length <= 72 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password)

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Método não permitido.' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Não autenticado.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return json({ error: 'Configuração interna ausente.' }, 500)

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Sessão inválida ou expirada.' }, 401)

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: administrator, error: administratorError } = await serviceClient
    .from('admin_users')
    .select('user_id, active')
    .eq('user_id', userData.user.id)
    .eq('active', true)
    .maybeSingle()

  if (administratorError) return json({ error: 'Não foi possível validar o acesso.' }, 500)
  if (!administrator) return json({ error: 'Acesso administrativo negado.' }, 403)

  if (request.method === 'GET') {
    const { data, error } = await serviceClient
      .from('admin_users')
      .select('user_id, email, active, created_at, updated_at')
      .order('created_at', { ascending: true })
    if (error) return json({ error: 'Não foi possível listar administradores.' }, 500)
    return json({ administrators: data })
  }

  let payload: { email?: unknown; password?: unknown }
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!emailPattern.test(email) || email.length > 320) return json({ error: 'Informe um e-mail válido.' }, 400)
  if (!validPassword(password)) {
    return json({ error: 'A senha deve ter de 8 a 72 caracteres e incluir letra, número e símbolo.' }, 400)
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })
  if (createError || !created.user) {
    const duplicate = createError?.message.toLowerCase().includes('already')
    return json({ error: duplicate ? 'Este e-mail já está cadastrado.' : 'Não foi possível criar o usuário.' }, duplicate ? 409 : 400)
  }

  const { error: profileError } = await serviceClient.from('admin_users').insert({
    user_id: created.user.id,
    email,
    active: true,
    created_by: userData.user.id,
  })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(created.user.id)
    return json({ error: 'Não foi possível conceder acesso administrativo.' }, 500)
  }

  return json({ administrator: { user_id: created.user.id, email, active: true } }, 201)
})
