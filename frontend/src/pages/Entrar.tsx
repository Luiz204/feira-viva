import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ErrorBox, PageTitle } from '../components/ui'
import { useAuth } from '../lib/auth'
import { USUARIOS_DEMO } from '../lib/demo'

export default function Entrar() {
  const { user, demo, entrar, cadastrar, entrarDemo } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/painel'} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)
    try {
      if (modo === 'entrar') await entrar(email, senha)
      else {
        const { precisaConfirmar } = await cadastrar(nome, email, senha)
        if (precisaConfirmar) setAviso('Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre.')
      }
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

      {demo ? (
        <div className="card flex flex-col gap-3 p-5">
          <p className="text-sm text-folha-900/70">
            O Supabase não está configurado, então o login usa contas de exemplo. Escolha uma:
          </p>
          {USUARIOS_DEMO.map((u) => (
            <button key={u.id} type="button" onClick={() => entrarDemo(u.id)} className="btn-ghost justify-between">
              <span>{u.nome}</span>
              <span className="text-xs font-normal text-folha-900/50">{u.papel}</span>
            </button>
          ))}
        </div>
      ) : (
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
          {aviso && <p className="rounded-xl bg-folha-50 px-4 py-3 text-sm">{aviso}</p>}
          <button className="btn-primary" disabled={carregando}>
            {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
          <button type="button" onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')} className="text-sm text-folha-600 hover:underline">
            {modo === 'entrar' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </form>
      )}
    </div>
  )
}
