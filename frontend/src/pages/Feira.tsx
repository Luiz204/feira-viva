import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Empty, ErrorBox, Foto, PageTitle, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { diasSemana, horario } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export default function Feira() {
  const { id = '' } = useParams()
  const { data: feira, error, loading } = useAsync(() => api.feira(id), [id])

  if (loading) return <Spinner />
  if (error || !feira) return <ErrorBox message={error ?? 'Feira não encontrada'} />

  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${feira.endereco}, ${feira.bairro}, ${feira.cidade}`)}`

  return (
    <>
      <Link to="/feiras" className="mb-4 inline-block text-sm text-folha-600 hover:underline">
        ← Todas as feiras
      </Link>
      <PageTitle eyebrow={`${diasSemana(feira.dias_semana)} · ${horario(feira.horario_inicio, feira.horario_fim)}`} title={feira.nome}>
        {feira.endereco}
        {feira.bairro && `, ${feira.bairro}`} — {feira.cidade} ·{' '}
        <a href={mapa} target="_blank" rel="noreferrer" className="font-medium text-folha-600 hover:underline">
          abrir no mapa
        </a>
      </PageTitle>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-folha-900/60">Produtores ({feira.produtores.length})</h2>
      <div className="-mx-4 mb-8 flex gap-3 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {feira.produtores.map((p) => (
          <Link key={p.id} to={`/produtores/${p.id}`} className="card flex shrink-0 items-center gap-3 py-2 pl-2 pr-4 hover:border-folha-600">
            <Foto src={p.foto_url} alt={p.nome_banca} className="h-10 w-10 rounded-full text-base" />
            <span className="text-sm font-medium">{p.nome_banca}</span>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-folha-900/60">Produtos disponíveis</h2>
      {feira.produtos.length === 0 ? (
        <Empty title="Sem produtos cadastrados nesta feira" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {feira.produtos.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
      )}
    </>
  )
}
