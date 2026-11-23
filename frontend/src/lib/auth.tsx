import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Me } from '../types'
import { api, setTokenGetter } from './api'

type AuthState = {
  user: Me | null
  loading: boolean
  /** true quando a API roda sem banco (dados de exemplo). */
  demo: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>
  sair: () => void
  recarregar: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const TOKEN_KEY = 'feiraviva:token'

function lerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* navegação privada: a sessão fica só nesta aba */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useRef<string | null>(lerToken())
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(token.current !== null)
  const [demo, setDemo] = useState(false)

  useEffect(() => setTokenGetter(() => token.current), [])

  useEffect(() => {
    api
      .health()
      .then((h) => setDemo(h.banco !== 'postgresql'))
      .catch(() => undefined)
  }, [])

  const recarregar = useCallback(async () => {
    if (!token.current) return
    try {
      setUser(await api.me())
    } catch {
      token.current = null
      salvarToken(null)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (token.current) void recarregar().finally(() => setLoading(false))
  }, [recarregar])

  const iniciarSessao = useCallback((novoToken: string, perfil: Me) => {
    token.current = novoToken
    salvarToken(novoToken)
    setUser(perfil)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      demo,
      recarregar,
      async entrar(email, senha) {
        const sessao = await api.entrar(email, senha)
        iniciarSessao(sessao.token, sessao.user)
      },
      async cadastrar(nome, email, senha) {
        const sessao = await api.cadastrar(nome, email, senha)
        iniciarSessao(sessao.token, sessao.user)
      },
      sair() {
        token.current = null
        salvarToken(null)
        setUser(null)
      },
    }),
    [user, loading, demo, recarregar, iniciarSessao],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
