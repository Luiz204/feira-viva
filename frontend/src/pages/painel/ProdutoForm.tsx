import { useState, type FormEvent } from 'react'
import { ErrorBox, Foto } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { enviarFoto } from '../../lib/supabase'
import type { Meta, Product } from '../../types'

type Props = { meta: Meta; produto?: Product; onSalvo: (p: Product) => void; onCancelar: () => void }

export default function ProdutoForm({ meta, produto, onSalvo, onCancelar }: Props) {
  const { user, demo } = useAuth()
  const [form, setForm] = useState({
    nome: produto?.nome ?? '',
    categoria: produto?.categoria ?? meta.categorias[0],
    preco: produto ? String(Number(produto.preco)).replace('.', ',') : '',
    unidade: produto?.unidade ?? meta.unidades[0],
    descricao: produto?.descricao ?? '',
    foto_url: produto?.foto_url ?? '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const set = (campo: keyof typeof form, valor: string) => setForm((f) => ({ ...f, [campo]: valor }))

  async function trocarFoto(arquivo: File | undefined) {
    if (!arquivo || !user) return
    setErro(null)
    setEnviandoFoto(true)
    try {
      set('foto_url', await enviarFoto(arquivo, user.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no upload')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const preco = form.preco.replace(/\./g, '').replace(',', '.')
    if (!(Number(preco) > 0)) {
      setErro('Informe um preço maior que zero')
      return
    }
    const dados = { ...form, preco, descricao: form.descricao || null, foto_url: form.foto_url || null }
    setSalvando(true)
    try {
      onSalvo(produto ? await api.editarProduto(produto.id, dados) : await api.criarProduto(dados))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="card flex flex-col gap-4 p-5">
      <h3 className="font-display text-lg font-semibold">{produto ? 'Editar produto' : 'Novo produto'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Nome *</span>
          <input className="input" required maxLength={80} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Alface crespa" />
        </label>
        <label>
          <span className="label">Categoria *</span>
          <select className="input" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {meta.categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Preço (R$) *</span>
            <input className="input" required inputMode="decimal" value={form.preco} onChange={(e) => set('preco', e.target.value)} placeholder="2,50" />
          </label>
          <label>
            <span className="label">Por *</span>
            <select className="input" value={form.unidade} onChange={(e) => set('unidade', e.target.value)}>
              {meta.unidades.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="sm:col-span-2">
          <span className="label">Descrição</span>
          <textarea className="input min-h-20" maxLength={500} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        </label>
        <div className="flex items-center gap-4 sm:col-span-2">
          <Foto src={form.foto_url || null} alt={form.nome || 'Produto'} className="h-20 w-20 shrink-0 rounded-xl" />
          {demo ? (
            <label className="flex-1">
              <span className="label">Link da foto (opcional)</span>
              <input className="input" type="url" value={form.foto_url} onChange={(e) => set('foto_url', e.target.value)} placeholder="https://…" />
            </label>
          ) : (
            <label className="btn-ghost cursor-pointer">
              {enviandoFoto ? 'Enviando…' : form.foto_url ? 'Trocar foto' : 'Escolher foto'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => trocarFoto(e.target.files?.[0])} />
            </label>
          )}
        </div>
      </div>
      {erro && <ErrorBox message={erro} />}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="btn-ghost">
          Cancelar
        </button>
        <button className="btn-primary" disabled={salvando || enviandoFoto}>
          {salvando ? 'Salvando…' : 'Salvar produto'}
        </button>
      </div>
    </form>
  )
}
