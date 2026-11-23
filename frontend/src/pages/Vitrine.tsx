import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { Empty, ErrorBox, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'

export default function Vitrine() {
  const [busca, setBusca] = useState('')
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [feiraId, setFeiraId] = useState('')

  // espera o usuário parar de digitar antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  const meta = useAsync(() => api.meta(), [])
  const feiras = useAsync(() => api.feiras(), [])
  const produtos = useAsync(() => api.vitrine({ q, categoria, feira_id: feiraId }), [q, categoria, feiraId])

  const filtrando = Boolean(q || categoria || feiraId)

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-3xl bg-folha-700 px-5 py-7 text-palha-50 md:px-10 md:py-14">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-palha-200">Agricultura familiar · Feiras livres</p>
        <h1 className="max-w-2xl font-display text-3xl font-semibold leading-[1.05] md:text-5xl">
          Comida fresca, direto de quem planta.
        </h1>
        <p className="mt-3 hidden max-w-xl text-palha-100/80 sm:block">
          Escolha os produtos, monte seu pedido e combine a entrega pelo WhatsApp do produtor. Sem atravessador.
        </p>
        <label className="mt-6 block max-w-xl">
          <span className="sr-only">Buscar produto</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar alface, ovos, mel…"
            className="w-full rounded-2xl border-0 bg-white px-5 py-3.5 text-folha-900 shadow-lg outline-none ring-terra-500 placeholder:text-folha-900/40 focus:ring-2"
          />
        </label>
      </section>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Chip ativo={!categoria} onClick={() => setCategoria('')}>
            Tudo
          </Chip>
          {meta.data?.categorias.map((c) => (
            <Chip key={c} ativo={categoria === c} onClick={() => setCategoria(categoria === c ? '' : c)}>
              {c}
            </Chip>
          ))}
        </div>
        <select value={feiraId} onChange={(e) => setFeiraId(e.target.value)} className="input md:w-72" aria-label="Filtrar por feira">
          <option value="">Todas as feiras</option>
          {feiras.data?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>

      {produtos.error && <ErrorBox message={produtos.error} />}
      {produtos.loading && !produtos.data && <Spinner />}
      {produtos.data && produtos.data.length === 0 && (
        <Empty title={filtrando ? 'Nada encontrado' : 'Vitrine vazia por enquanto'}>
          {filtrando ? 'Tente outra palavra, categoria ou feira.' : 'Os produtores ainda estão cadastrando os produtos.'}
        </Empty>
      )}
      {produtos.data && produtos.data.length > 0 && (
        <div className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 md:gap-4 lg:grid-cols-4 ${produtos.loading ? 'opacity-60' : ''}`}>
          {produtos.data.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      )}
    </>
  )
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
        ativo ? 'border-folha-700 bg-folha-700 text-palha-50' : 'border-palha-200 bg-white text-folha-900/80 hover:border-folha-600'
      }`}
    >
      {children}
    </button>
  )
}
