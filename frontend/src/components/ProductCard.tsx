import { Link } from 'react-router-dom'
import { brl } from '../lib/format'
import { useCart } from '../lib/useCart'
import type { Product } from '../types'
import { Foto } from './ui'

export default function ProductCard({ produto, mostrarProdutor = true }: { produto: Product; mostrarProdutor?: boolean }) {
  const { itens, adicionar } = useCart()
  const noCarrinho = itens.find((i) => i.productId === produto.id)

  return (
    <article className="card group flex flex-col overflow-hidden">
      <Foto src={produto.foto_url} alt={produto.nome} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-terra-600">{produto.categoria}</p>
        <h3 className="font-semibold leading-snug text-folha-900">{produto.nome}</h3>
        <p className="text-sm text-folha-900/70">
          <span className="text-base font-semibold text-folha-900">{brl(produto.preco)}</span> / {produto.unidade}
        </p>
        {mostrarProdutor && produto.produtor && (
          <Link to={`/produtores/${produto.produtor.id}`} className="truncate text-xs text-folha-600 hover:underline">
            {produto.produtor.nome_banca}
          </Link>
        )}
        <div className="mt-auto pt-2">
          {produto.disponivel ? (
            <button type="button" onClick={() => adicionar(produto)} className={noCarrinho ? 'btn-ghost w-full' : 'btn-primary w-full'}>
              {noCarrinho ? `No carrinho · adicionar mais` : 'Adicionar'}
            </button>
          ) : (
            <p className="rounded-xl bg-palha-100 py-2.5 text-center text-sm text-folha-900/50">Esgotado</p>
          )}
        </div>
      </div>
    </article>
  )
}
