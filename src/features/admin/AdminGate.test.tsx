import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AdminLoginForm } from './AdminGate'

describe('login administrativo', () => {
  it('renderiza o formulário atual com os atributos de autenticação', () => {
    const html = renderToStaticMarkup(<AdminLoginForm
      email=""
      password=""
      error=""
      busy={false}
      onEmailChange={vi.fn()}
      onPasswordChange={vi.fn()}
      onSubmit={vi.fn()}
    />)

    expect(html).toContain('Bem-Vindo')
    expect(html).toContain('Faça login para gerenciar seu estoque.')
    expect(html).toContain('class="admin-login-form"')
    expect(html).toContain('type="email"')
    expect(html).toContain('autoComplete="username"')
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="current-password"')
    expect(html).toContain('aria-label="Acessar plataforma"')
    expect(html).toContain('ACESSAR PLATAFORMA')
    expect(html).toContain('BUSCA INTELIGENTE')
    expect(html).toContain('INVENTÁRIO PRECISO')
    expect(html).toContain('LEITURA DE CÓDIGO')
    expect(html).toContain('RELATÓRIOS CLAROS')
    expect(html).not.toContain('admin-login-artboard')
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
    expect(html).toContain('Acessando...')
  })
})
