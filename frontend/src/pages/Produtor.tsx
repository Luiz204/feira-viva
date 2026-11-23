import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Empty, ErrorBox, Foto, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { diasSemana, telefone } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export default function Produtor() {
  const { id = '' } = useParams()
  const { data: p, error, loading } = useAsync(() => api.produtor(id), [id])

  if (loading) return <Spinner />
  if (error || !p) return <ErrorBox message={error ?? 'Produtor não encontrado'} />

  return (
    <>
      <section className="card mb-8 flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <Foto src={p.foto_url} alt={p.nome_banca} className="h-20 w-20 shrink-0 rounded-2xl" />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra-600">{p.cidade}</p>
          <h1 className="font-display text-3xl font-semibold">{p.nome_banca}</h1>
          {p.descricao && <p className="mt-1 max-w-2xl text-folha-900/70">{p.descricao}</p>}
          {p.feiras.length > 0 && (
            <p className="mt-2 text-sm text-folha-900/70">
              Vende em:{' '}
              {p.feiras.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && ' · '}
                  <Link to={`/feiras/${f.id}`} className="font-medium text-folha-600 hover:underline">
                    {f.nome}
                  </Link>{' '}
                  ({diasSemana(f.dias_semana)})
                </span>
              ))}
            </p>
          )}
        </div>
        {p.whatsapp && (
          <a href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noreferrer" className="btn-zap">
            WhatsApp {telefone(p.whatsapp)}
          </a>
        )}
      </section>

      {p.produtos.length === 0 ? (
        <Empty title="Nenhum produto cadastrado" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {p.produtos.map((prod) => (
            <ProductCard key={prod.id} produto={prod} mostrarProdutor={false} />
          ))}
        </div>
      )}
    </>
  )
}
