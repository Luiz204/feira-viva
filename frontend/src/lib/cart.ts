/** Regras do carrinho (funções puras, testadas em cart.test.ts). */

export type CartItem = {
  productId: string
  produtorId: string
  produtorNome: string
  nome: string
  unidade: string
  preco: number
  quantidade: number
}

export type CartGroup = {
  produtorId: string
  produtorNome: string
  itens: CartItem[]
  total: number
}

const PASSO_FRACIONADO = new Set(['kg', 'litro'])

/** kg e litro andam de 0,5 em 0,5; o resto de 1 em 1. */
export function passo(unidade: string): number {
  return PASSO_FRACIONADO.has(unidade) ? 0.5 : 1
}

export function addItem(cart: CartItem[], item: Omit<CartItem, 'quantidade'>, quantidade?: number): CartItem[] {
  const qtd = quantidade ?? passo(item.unidade)
  const existente = cart.find((i) => i.productId === item.productId)
  if (existente) {
    return cart.map((i) => (i.productId === item.productId ? { ...i, quantidade: i.quantidade + qtd } : i))
  }
  return [...cart, { ...item, quantidade: qtd }]
}

export function setQuantidade(cart: CartItem[], productId: string, quantidade: number): CartItem[] {
  if (quantidade <= 0) return removeItem(cart, productId)
  return cart.map((i) => (i.productId === productId ? { ...i, quantidade } : i))
}

export function removeItem(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((i) => i.productId !== productId)
}

export function removeProdutor(cart: CartItem[], produtorId: string): CartItem[] {
  return cart.filter((i) => i.produtorId !== produtorId)
}

export function subtotal(item: CartItem): number {
  return Math.round(item.preco * item.quantidade * 100) / 100
}

/** US15/RN05: um pedido por produtor, na ordem em que foram adicionados. */
export function agruparPorProdutor(cart: CartItem[]): CartGroup[] {
  const grupos = new Map<string, CartGroup>()
  for (const item of cart) {
    const grupo = grupos.get(item.produtorId) ?? {
      produtorId: item.produtorId,
      produtorNome: item.produtorNome,
      itens: [],
      total: 0,
    }
    grupo.itens.push(item)
    grupo.total = Math.round((grupo.total + subtotal(item)) * 100) / 100
    grupos.set(item.produtorId, grupo)
  }
  return [...grupos.values()]
}

export function contarItens(cart: CartItem[]): number {
  return cart.length
}
