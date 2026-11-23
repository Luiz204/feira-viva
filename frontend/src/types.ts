export type ProducerSummary = { id: string; nome_banca: string; cidade: string }

export type Product = {
  id: string
  produtor_id: string
  nome: string
  categoria: string
  preco: string
  unidade: string
  descricao: string | null
  foto_url: string | null
  disponivel: boolean
  ativo: boolean
  criado_em: string
  produtor: ProducerSummary | null
}

export type Fair = {
  id: string
  nome: string
  endereco: string
  bairro: string
  cidade: string
  dias_semana: number[]
  horario_inicio: string
  horario_fim: string
  ativo: boolean
}

export type ProducerPublic = {
  id: string
  nome: string
  nome_banca: string
  cidade: string
  whatsapp: string | null
  descricao: string | null
  foto_url: string | null
}

export type Me = ProducerPublic & { role: 'produtor' | 'admin'; ativo: boolean }

export type FairDetail = Fair & { produtores: ProducerPublic[]; produtos: Product[] }
export type ProducerDetail = ProducerPublic & { produtos: Product[]; feiras: Fair[] }

export type OrderItem = {
  product_id: string
  nome: string
  unidade: string
  preco: string
  quantidade: string
  subtotal: string
}

export type Order = {
  id: string
  produtor_id: string
  cliente_nome: string
  cliente_telefone: string | null
  entrega: 'retirada' | 'entrega'
  observacao: string | null
  itens: OrderItem[]
  total: string
  status: string
  criado_em: string
}

export type OrderCreated = Order & { mensagem: string; whatsapp_url: string }

export type Meta = { categorias: string[]; unidades: string[] }
