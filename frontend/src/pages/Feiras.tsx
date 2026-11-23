import { Link } from 'react-router-dom'
import { Empty, ErrorBox, PageTitle, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { diasSemana, horario } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export default function Feiras() {
  const { data, error, loading } = useAsync(() => api.feiras(), [])

  return (
    <>
      <PageTitle eyebrow="Onde comprar" title="Feiras livres">
        Dias, horários e quem vende em cada feira.
      </PageTitle>
      {error && <ErrorBox message={error} />}
      {loading && <Spinner />}
      {data?.length === 0 && <Empty title="Nenhuma feira cadastrada ainda" />}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((f) => (
          <Link key={f.id} to={`/feiras/${f.id}`} className="card group flex flex-col gap-3 p-5 transition hover:border-folha-600">
            <h2 className="font-display text-xl font-semibold text-folha-900 group-hover:text-folha-700">{f.nome}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-folha-900/50">Quando</dt>
              <dd className="font-medium">
                {diasSemana(f.dias_semana)} · {horario(f.horario_inicio, f.horario_fim)}
              </dd>
              <dt className="text-folha-900/50">Onde</dt>
              <dd>
                {f.endereco}
                {f.bairro && `, ${f.bairro}`} — {f.cidade}
              </dd>
            </dl>
            <span className="text-sm font-semibold text-folha-600">Ver produtores e produtos →</span>
          </Link>
        ))}
      </div>
    </>
  )
}
