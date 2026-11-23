import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types'
import { addItem, removeItem, removeProdutor, setQuantidade, type CartItem } from './cart'

type CartState = {
  itens: CartItem[]
  adicionar: (produto: Product) => void
  alterar: (productId: string, quantidade: number) => void
  remover: (productId: string) => void
  limparProdutor: (produtorId: string) => void
}

const CartContext = createContext<CartState | null>(null)
const KEY = 'feiraviva:carrinho'

function carregar(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[]
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>(carregar)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(itens))
    } catch {
      /* armazenamento indisponível: carrinho fica só nesta aba */
    }
  }, [itens])

  const value = useMemo<CartState>(
    () => ({
      itens,
      adicionar: (p) =>
        setItens((c) =>
          addItem(c, {
            productId: p.id,
            produtorId: p.produtor_id,
            produtorNome: p.produtor?.nome_banca ?? 'Produtor',
            nome: p.nome,
            unidade: p.unidade,
            preco: Number(p.preco),
          }),
        ),
      alterar: (id, q) => setItens((c) => setQuantidade(c, id, q)),
      remover: (id) => setItens((c) => removeItem(c, id)),
      limparProdutor: (id) => setItens((c) => removeProdutor(c, id)),
    }),
    [itens],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useCart(): CartState {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return ctx
}
