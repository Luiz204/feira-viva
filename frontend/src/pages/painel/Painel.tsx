import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorBox, Foto, PageTitle, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { brl, diasSemana, quantidade, telefone } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import type { Product } from '../../types'
import ProdutoForm from './ProdutoForm'

const ABAS = ['Produtos', 'Perfil', 'Feiras', 'Pedidos'] as const
type Aba = (typeof ABAS)[number]

export default function Painel() {
  const { user, sair } = useAuth()
  const [aba, setAba] = useState<Aba>(user?.whatsapp ? 'Produtos' : 'Perfil')
  if (!user) return null

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageTitle eyebrow="Meu painel" title={user.nome_banca || user.nome || 'Produtor'} />
        <div className="flex gap-2">
          {user.whatsapp && (
            <Link to={`/produtores/${user.id}`} className="btn-ghost hidden sm:inline-flex">
              Ver minha página
            </Link>
          )}
          <button type="button" onClick={sair} className="btn-ghost">
            Sair
          </button>
        </div>
      </div>

      {!user.whatsapp && (
        <div className="mb-5 rounded-xl border border-terra-500/30 bg-terra-500/10 px-4 py-3 text-sm">
          Cadastre o seu <strong>WhatsApp</strong> na aba Perfil: sem ele seus produtos não aparecem na vitrine.
        </div>
      )}

      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-palha-200">
        {ABAS.map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${aba === a ? 'border-folha-700 text-folha-900' : 'border-transparent text-folha-900/50 hover:text-folha-900'}`}
          >
            {a}
          </button>
        ))}
      </div>

      {aba === 'Produtos' && <AbaProdutos />}
      {aba === 'Perfil' && <AbaPerfil />}
      {aba === 'Feiras' && <AbaFeiras />}
      {aba === 'Pedidos' && <AbaPedidos />}
    </>
  )
}

function AbaProdutos() {
  const meta = useAsync(() => api.meta(), [])
  const lista = useAsync(() => api.meusProdutos(), [])
  const [editando, setEditando] = useState<Product | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (lista.loading || meta.loading) return <Spinner />
  if (lista.error || meta.error) return <ErrorBox message={(lista.error ?? meta.error)!} />
  const produtos = lista.data ?? []

  const substituir = (p: Product) =>
    lista.setData(produtos.some((x) => x.id === p.id) ? produtos.map((x) => (x.id === p.id ? p : x)) : [p, ...produtos])

  async function alternar(p: Product) {
    setErro(null)
    try {
      substituir(await api.editarProduto(p.id, { disponivel: !p.disponivel }))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar')
    }
  }

  async function excluir(p: Product) {
    if (!window.confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.excluirProduto(p.id)
      lista.setData(produtos.filter((x) => x.id !== p.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  if (editando) {
    return (
      <ProdutoForm
        meta={meta.data!}
        produto={editando === 'novo' ? undefined : editando}
        onCancelar={() => setEditando(null)}
        onSalvo={(p) => {
          substituir(p)
          setEditando(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setEditando('novo')} className="btn-primary self-start">
        + Novo produto
      </button>
      {erro && <ErrorBox message={erro} />}
      {produtos.length === 0 && <Empty title="Você ainda não tem produtos">Cadastre o primeiro: leva menos de um minuto.</Empty>}
      {produtos.map((p) => (
        <div key={p.id} className="card flex items-center gap-4 p-3">
          <Foto src={p.foto_url} alt={p.nome} className="h-14 w-14 shrink-0 rounded-xl text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.nome}</p>
            <p className="text-sm text-folha-900/60">
              {brl(p.preco)} / {p.unidade} · {p.categoria}
              {!p.ativo && <span className="ml-2 text-terra-600">(desativado pelo admin)</span>}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-folha-900/60">
            <span className="hidden sm:inline">{p.disponivel ? 'Disponível' : 'Esgotado'}</span>
            <input type="checkbox" role="switch" checked={p.disponivel} onChange={() => alternar(p)} aria-label={`${p.nome} disponível`} className="peer sr-only" />
            <span className="relative h-6 w-11 rounded-full bg-palha-200 transition peer-checked:bg-folha-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          </label>
          <button type="button" onClick={() => setEditando(p)} className="text-sm font-medium text-folha-600 hover:underline">
            Editar
          </button>
          <button type="button" onClick={() => excluir(p)} className="text-sm text-folha-900/40 hover:text-terra-600">
            Excluir
          </button>
        </div>
      ))}
    </div>
  )
}

function AbaPerfil() {
  const { user, recarregar } = useAuth()
  const [form, setForm] = useState({
    nome: user?.nome ?? '',
    nome_banca: user?.nome_banca ?? '',
    cidade: user?.cidade ?? '',
    whatsapp: telefone(user?.whatsapp ?? null),
    descricao: user?.descricao ?? '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const set = (campo: keyof typeof form, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setOk(false)
    setSalvando(true)
    try {
      await api.atualizarPerfil({ ...form, whatsapp: form.whatsapp || null })
      await recarregar()
      setOk(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-2">
      <label>
        <span className="label">Seu nome</span>
        <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
      </label>
      <label>
        <span className="label">Nome da banca / sítio</span>
        <input className="input" value={form.nome_banca} onChange={(e) => set('nome_banca', e.target.value)} placeholder="Ex.: Sítio Boa Esperança" />
      </label>
      <label>
        <span className="label">Cidade</span>
        <input className="input" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
      </label>
      <label>
        <span className="label">WhatsApp *</span>
        <input className="input" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="(86) 99999-1234" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Sobre você</span>
        <textarea className="input min-h-24" maxLength={500} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="O que você planta, há quanto tempo, como produz…" />
      </label>
      <p className="text-xs text-folha-900/50 sm:col-span-2">
        Seu WhatsApp fica visível para os clientes para que eles possam enviar pedidos.
      </p>
      {erro && (
        <div className="sm:col-span-2">
          <ErrorBox message={erro} />
        </div>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar perfil'}
        </button>
        {ok && <span className="text-sm text-folha-600">Perfil salvo.</span>}
      </div>
    </form>
  )
}

function AbaFeiras() {
  const feiras = useAsync(() => api.feiras(), [])
  const minhas = useAsync(() => api.minhasFeiras(), [])
  const [selecao, setSelecao] = useState<string[] | null>(null)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (feiras.loading || minhas.loading) return <Spinner />
  if (feiras.error || minhas.error) return <ErrorBox message={(feiras.error ?? minhas.error)!} />
  const marcadas = selecao ?? minhas.data!.feira_ids

  const alternar = (id: string) => {
    setOk(false)
    setSelecao(marcadas.includes(id) ? marcadas.filter((x) => x !== id) : [...marcadas, id])
  }

  async function salvar() {
    setErro(null)
    try {
      await api.definirFeiras(marcadas)
      setOk(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm text-folha-900/70">Marque as feiras em que você tem banca.</p>
      {feiras.data!.map((f) => (
        <label key={f.id} className={`card flex cursor-pointer items-center gap-3 p-4 ${marcadas.includes(f.id) ? 'border-folha-600 bg-folha-50' : ''}`}>
          <input type="checkbox" checked={marcadas.includes(f.id)} onChange={() => alternar(f.id)} className="h-5 w-5 accent-folha-700" />
          <span className="flex-1">
            <span className="block font-medium">{f.nome}</span>
            <span className="text-sm text-folha-900/60">
              {diasSemana(f.dias_semana)} · {f.bairro || f.cidade}
            </span>
          </span>
        </label>
      ))}
      {erro && <ErrorBox message={erro} />}
      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} className="btn-primary">
          Salvar feiras
        </button>
        {ok && <span className="text-sm text-folha-600">Feiras salvas.</span>}
      </div>
    </div>
  )
}

function AbaPedidos() {
  const { data, error, loading } = useAsync(() => api.meusPedidos(), [])
  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />
  if (!data?.length) return <Empty title="Nenhum pedido ainda">Os pedidos enviados pelos clientes aparecem aqui e no seu WhatsApp.</Empty>

  return (
    <div className="flex flex-col gap-3">
      {data.map((o) => (
        <article key={o.id} className="card p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{o.cliente_nome}</p>
            <p className="text-xs text-folha-900/50">{new Date(o.criado_em).toLocaleString('pt-BR')}</p>
          </div>
          <ul className="text-sm text-folha-900/80">
            {o.itens.map((i) => (
              <li key={i.product_id}>
                {quantidade(Number(i.quantidade))} {i.unidade} de {i.nome} — {brl(i.subtotal)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <strong>{brl(o.total)}</strong> · {o.entrega === 'retirada' ? 'Retirada na feira' : 'Combinar entrega'}
            {o.cliente_telefone && ` · ${o.cliente_telefone}`}
          </p>
          {o.observacao && <p className="mt-1 text-sm text-folha-900/60">Obs.: {o.observacao}</p>}
        </article>
      ))}
    </div>
  )
}
