import { useState, type FormEvent } from 'react'
import { ErrorBox, PageTitle, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { diasSemana, horario, telefone } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import type { Fair } from '../types'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const VAZIA = { nome: '', endereco: '', bairro: '', cidade: 'Teresina', dias_semana: [] as number[], horario_inicio: '06:00', horario_fim: '12:00' }

export default function Admin() {
  const { sair } = useAuth()
  return (
    <>
      <div className="flex items-start justify-between">
        <PageTitle eyebrow="Administração" title="Feiras e produtores" />
        <button type="button" onClick={sair} className="btn-ghost">
          Sair
        </button>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Feiras />
        <Produtores />
      </div>
    </>
  )
}

function Feiras() {
  const lista = useAsync(() => api.adminFeiras(), [])
  const [form, setForm] = useState(VAZIA)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function editar(f: Fair) {
    setEditandoId(f.id)
    setForm({ ...f, horario_inicio: f.horario_inicio.slice(0, 5), horario_fim: f.horario_fim.slice(0, 5) })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      if (editandoId) await api.adminEditarFeira(editandoId, form)
      else await api.adminCriarFeira(form)
      setForm(VAZIA)
      setEditandoId(null)
      await lista.reload()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  async function alternar(f: Fair) {
    await api.adminEditarFeira(f.id, { ativo: !f.ativo })
    await lista.reload()
  }

  const dia = (d: number) =>
    setForm((f) => ({ ...f, dias_semana: f.dias_semana.includes(d) ? f.dias_semana.filter((x) => x !== d) : [...f.dias_semana, d] }))

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold">Feiras</h2>
      <form onSubmit={salvar} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Nome</span>
          <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>
        <label>
          <span className="label">Endereço</span>
          <input className="input" required value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        </label>
        <label>
          <span className="label">Bairro</span>
          <input className="input" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="label">Dias</legend>
          <div className="flex flex-wrap gap-1.5">
            {DIAS.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={form.dias_semana.includes(i)}
                onClick={() => dia(i)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${form.dias_semana.includes(i) ? 'border-folha-700 bg-folha-700 text-white' : 'border-palha-200'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          <span className="label">Início</span>
          <input type="time" className="input" value={form.horario_inicio} onChange={(e) => setForm({ ...form, horario_inicio: e.target.value })} />
        </label>
        <label>
          <span className="label">Fim</span>
          <input type="time" className="input" value={form.horario_fim} onChange={(e) => setForm({ ...form, horario_fim: e.target.value })} />
        </label>
        {erro && (
          <div className="sm:col-span-2">
            <ErrorBox message={erro} />
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button className="btn-primary">{editandoId ? 'Salvar alterações' : 'Cadastrar feira'}</button>
          {editandoId && (
            <button type="button" className="btn-ghost" onClick={() => { setEditandoId(null); setForm(VAZIA) }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
      {lista.loading && <Spinner />}
      <ul className="flex flex-col gap-2">
        {lista.data?.map((f) => (
          <li key={f.id} className={`card flex items-center gap-3 p-3 ${f.ativo ? '' : 'opacity-60'}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{f.nome}</p>
              <p className="text-xs text-folha-900/60">
                {diasSemana(f.dias_semana)} · {horario(f.horario_inicio, f.horario_fim)}
              </p>
            </div>
            <button type="button" onClick={() => editar(f)} className="text-sm text-folha-600 hover:underline">
              Editar
            </button>
            <button type="button" onClick={() => alternar(f)} className="text-sm text-folha-900/50 hover:text-terra-600">
              {f.ativo ? 'Desativar' : 'Ativar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Produtores() {
  const lista = useAsync(() => api.adminProdutores(), [])

  async function alternar(id: string, ativo: boolean) {
    await api.adminModerarProdutor(id, ativo)
    await lista.reload()
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold">Produtores</h2>
      {lista.error && <ErrorBox message={lista.error} />}
      {lista.loading && <Spinner />}
      <ul className="flex flex-col gap-2">
        {lista.data?.map((p) => (
          <li key={p.id} className={`card flex items-center gap-3 p-3 ${p.ativo ? '' : 'opacity-60'}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.nome_banca || p.nome || 'Sem nome'}</p>
              <p className="text-xs text-folha-900/60">
                {p.cidade || 'Cidade não informada'} · {p.whatsapp ? telefone(p.whatsapp) : 'sem WhatsApp'}
              </p>
            </div>
            <button type="button" onClick={() => alternar(p.id, !p.ativo)} className={p.ativo ? 'btn-ghost py-1.5' : 'btn-primary py-1.5'}>
              {p.ativo ? 'Desativar' : 'Reativar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
