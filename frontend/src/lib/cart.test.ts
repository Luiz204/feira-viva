import { describe, expect, it } from 'vitest'
import { addItem, agruparPorProdutor, passo, removeProdutor, setQuantidade, type CartItem } from './cart'

const alface = { productId: 'a', produtorId: 'p1', produtorNome: 'Sítio', nome: 'Alface', unidade: 'maço', preco: 2.5 }
const tomate = { productId: 't', produtorId: 'p1', produtorNome: 'Sítio', nome: 'Tomate', unidade: 'kg', preco: 7 }
const ovos = { productId: 'o', produtorId: 'p2', produtorNome: 'Dona Maria', nome: 'Ovos', unidade: 'dúzia', preco: 12 }

describe('carrinho', () => {
  it('CT30: kg e litro somam de 0,5 em 0,5; outras unidades de 1 em 1', () => {
    expect(passo('kg')).toBe(0.5)
    expect(passo('maço')).toBe(1)
  })

  it('CT31: adicionar o mesmo produto soma a quantidade', () => {
    let cart: CartItem[] = []
    cart = addItem(cart, alface)
    cart = addItem(cart, alface)
    expect(cart).toHaveLength(1)
    expect(cart[0].quantidade).toBe(2)
  })

  it('CT32: agrupa itens por produtor e calcula o total de cada grupo', () => {
    let cart: CartItem[] = []
    cart = addItem(cart, alface, 2)
    cart = addItem(cart, ovos)
    cart = addItem(cart, tomate, 1.5)
    const grupos = agruparPorProdutor(cart)
    expect(grupos.map((g) => g.produtorId)).toEqual(['p1', 'p2'])
    expect(grupos[0].total).toBe(15.5)
    expect(grupos[1].total).toBe(12)
  })

  it('CT33: quantidade zero remove o item', () => {
    const cart = setQuantidade(addItem([], alface), 'a', 0)
    expect(cart).toHaveLength(0)
  })

  it('CT34: remover um produtor esvazia só o grupo dele', () => {
    const cart = removeProdutor(addItem(addItem([], alface), ovos), 'p1')
    expect(cart.map((i) => i.productId)).toEqual(['o'])
  })
})
