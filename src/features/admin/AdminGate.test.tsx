import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AdminLoginForm } from './AdminGate'

describe('login administrativo', () => {
  it('renderiza o formulário solicitado com os atributos de autenticação', () => {
    const html = renderToStaticMarkup(<AdminLoginForm
      email=""
      password=""
      error=""
      busy={false}
      onEmailChange={vi.fn()}
      onPasswordChange={vi.fn()}
      onSubmit={vi.fn()}
    />)

    expect(html).toContain('Bem Vindo!')
    expect(html).toContain('faça login para continuar.')
    expect(html).toContain('class="admin-login-form"')
    expect(html).toContain('type="email"')
    expect(html).toContain('autoComplete="username"')
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="current-password"')
    expect(html).toContain('aria-label="Entrar"')
    expect(html).toContain('→')
  })

  it('exibe erro de acesso e bloqueia o botão durante o envio', () => {
    const html = renderToStaticMarkup(<AdminLoginForm
      email="admin@empresa.com"
      password="senha-segura"
      error="E-mail ou senha inválidos."
      busy
      onEmailChange={vi.fn()}
      onPasswordChange={vi.fn()}
      onSubmit={vi.fn()}
    />)

    expect(html).toContain('role="alert"')
    expect(html).toContain('E-mail ou senha inválidos.')
    expect(html).toContain('disabled=""')
    expect(html).toContain('aria-label="Entrando"')
  })
})
