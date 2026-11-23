import { useEffect, useRef, useState, type DependencyList } from 'react'

type Estado<T> = { chave: string | null; data: T | null; error: string | null }

/**
 * Carrega dados de uma função assíncrona sempre que `deps` mudar.
 * Respostas atrasadas de buscas antigas são descartadas (evita "piscar" resultados).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [versao, setVersao] = useState(0)
  const [estado, setEstado] = useState<Estado<T>>({ chave: null, data: null, error: null })
  const fnRef = useRef(fn)
  const chave = JSON.stringify([...deps, versao])

  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    let cancelado = false
    fnRef.current().then(
      (data) => !cancelado && setEstado({ chave, data, error: null }),
      (e: unknown) =>
        !cancelado && setEstado((s) => ({ chave, data: s.data, error: e instanceof Error ? e.message : 'Erro inesperado' })),
    )
    return () => {
      cancelado = true
    }
  }, [chave])

  return {
    data: estado.data,
    error: estado.chave === chave ? estado.error : null,
    loading: estado.chave !== chave,
    reload: () => setVersao((v) => v + 1),
    setData: (data: T) => setEstado((s) => ({ ...s, data })),
  }
}
