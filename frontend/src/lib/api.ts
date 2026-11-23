import type { Fair, FairDetail, Me, Meta, Order, OrderCreated, ProducerDetail, Product } from '../types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

let getToken: () => string | null = () => null
export function setTokenGetter(fn: () => string | null) {
  getToken = fn
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function mensagemDeErro(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const primeiro = detail[0] as { loc?: string[]; msg?: string }
    const campo = primeiro.loc?.at(-1)
    return campo ? `${campo}: ${primeiro.msg}` : (primeiro.msg ?? 'Dados inválidos')
  }
  return 'Algo deu errado. Tente novamente.'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar à API. Ela está rodando?')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, mensagemDeErro(body))
  return body as T
}

const json = (data: unknown) => JSON.stringify(data)

export const api = {
  meta: () => request<Meta>('/meta'),
  vitrine: (params: { q?: string; categoria?: string; feira_id?: string }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][])
    return request<Product[]>(`/products?${qs}`)
  },
  feiras: () => request<Fair[]>('/fairs'),
  feira: (id: string) => request<FairDetail>(`/fairs/${id}`),
  produtor: (id: string) => request<ProducerDetail>(`/producers/${id}`),
  enviarPedido: (pedido: unknown) => request<OrderCreated>('/orders', { method: 'POST', body: json(pedido) }),

  me: () => request<Me>('/me'),
  atualizarPerfil: (dados: Partial<Me>) => request<Me>('/me', { method: 'PUT', body: json(dados) }),
  meusProdutos: () => request<Product[]>('/me/products'),
  criarProduto: (dados: unknown) => request<Product>('/me/products', { method: 'POST', body: json(dados) }),
  editarProduto: (id: string, dados: unknown) =>
    request<Product>(`/me/products/${id}`, { method: 'PATCH', body: json(dados) }),
  excluirProduto: (id: string) => request<void>(`/me/products/${id}`, { method: 'DELETE' }),
  minhasFeiras: () => request<{ feira_ids: string[] }>('/me/fairs'),
  definirFeiras: (feira_ids: string[]) =>
    request<{ feira_ids: string[] }>('/me/fairs', { method: 'PUT', body: json({ feira_ids }) }),
  meusPedidos: () => request<Order[]>('/me/orders'),

  adminFeiras: () => request<Fair[]>('/admin/fairs'),
  adminCriarFeira: (dados: unknown) => request<Fair>('/admin/fairs', { method: 'POST', body: json(dados) }),
  adminEditarFeira: (id: string, dados: unknown) =>
    request<Fair>(`/admin/fairs/${id}`, { method: 'PATCH', body: json(dados) }),
  adminProdutores: () => request<Me[]>('/admin/producers'),
  adminModerarProdutor: (id: string, ativo: boolean) =>
    request<Me>(`/admin/producers/${id}`, { method: 'PATCH', body: json({ ativo }) }),
}
