import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ErrorBox, PageTitle } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Entrar() {
  const { user, demo, entrar, cadastrar } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/painel'} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      if (modo === 'entrar') await entrar(email, senha)
      else await cadastrar(nome, email, senha)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível continuar')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle eyebrow="Área do produtor" title={modo === 'entrar' ? 'Entrar' : 'Criar conta de produtor'}>
        Cadastre seus produtos e receba pedidos no seu WhatsApp.
      </PageTitle>

      {demo && modo === 'entrar' && (
        <div className="mb-4 rounded-xl border border-folha-100 bg-folha-50 px-4 py-3 text-sm">
          <p className="mb-2 font-semibold">Modo demonstração: use uma conta de exemplo</p>
          <div className="flex flex-wrap gap-2">
            {['jose@demo.com', 'maria@demo.com', 'admin@demo.com'].map((e) => (
              <button key={e} type="button" onClick={() => { setEmail(e); setSenha('feiraviva') }} className="btn-ghost py-1.5 text-xs">
                {e}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-folha-900/60">Senha: feiraviva</p>
        </div>
      )}
        <form onSubmit={enviar} className="card flex flex-col gap-4 p-5">
          {modo === 'cadastrar' && (
            <label>
              <span className="label">Seu nome</span>
              <input className="input" required minLength={2} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            <span className="label">E-mail</span>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            <span className="label">Senha</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            />
          </label>
          {erro && <ErrorBox message={erro} />}
          <button className="btn-primary" disabled={carregando}>
            {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
          <button type="button" onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')} className="text-sm text-folha-600 hover:underline">
            {modo === 'entrar' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </form>
    </div>
  )
}
