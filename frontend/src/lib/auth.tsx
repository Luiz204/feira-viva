import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Me } from '../types'
import { api, setTokenGetter } from './api'
import { supabase } from './supabase'

type AuthState = {
  user: Me | null
  loading: boolean
  demo: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<{ precisaConfirmar: boolean }>
  entrarDemo: (perfilId: string) => Promise<void>
  sair: () => Promise<void>
  recarregar: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const DEMO_KEY = 'feiraviva:demo-token'


function lerDemo(): string | null {
  try {
    return localStorage.getItem(DEMO_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = supabase === null
  const token = useRef<string | null>(demo ? lerDemo() : null)
  const [user, setUser] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => setTokenGetter(() => token.current), [])

  const recarregar = useCallback(async () => {
    if (!token.current) {
      setUser(null)
      return
    }
    try {
      setUser(await api.me())
    } catch {
      token.current = null
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (demo) {
      recarregar().finally(() => setLoading(false))
      return
    }
    const client = supabase!
    client.auth.getSession().then(({ data }) => {
      token.current = data.session?.access_token ?? null
      recarregar().finally(() => setLoading(false))
    })
    const { data } = client.auth.onAuthStateChange((_evento, sessao) => {
      const novo = sessao?.access_token ?? null
      if (novo !== token.current) {
        token.current = novo
        void recarregar()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [demo, recarregar])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      demo,
      recarregar,
      async entrar(email, senha) {
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password: senha })
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message)
        token.current = data.session.access_token
        await recarregar()
      },
      async cadastrar(nome, email, senha) {
        const { data, error } = await supabase!.auth.signUp({ email, password: senha, options: { data: { nome } } })
        if (error) throw new Error(error.message)
        if (!data.session) return { precisaConfirmar: true }
        token.current = data.session.access_token
        await recarregar()
        return { precisaConfirmar: false }
      },
      async entrarDemo(perfilId) {
        token.current = `dev:${perfilId}`
        try {
          localStorage.setItem(DEMO_KEY, token.current)
        } catch {
          /* navegação privada: segue só em memória */
        }
        await recarregar()
      },
      async sair() {
        if (supabase) await supabase.auth.signOut()
        try {
          localStorage.removeItem(DEMO_KEY)
        } catch {
          /* ignora */
        }
        token.current = null
        setUser(null)
      },
    }),
    [user, loading, demo, recarregar],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
