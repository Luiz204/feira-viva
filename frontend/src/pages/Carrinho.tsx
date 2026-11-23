import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorBox, PageTitle } from '../components/ui'
import { api } from '../lib/api'
import { agruparPorProdutor, passo, subtotal, type CartGroup } from '../lib/cart'
import { brl, quantidade } from '../lib/format'
import { useCart } from '../lib/useCart'

type Cliente = { nome: string; telefone: string; entrega: 'retirada' | 'entrega'; observacao: string }
const CLIENTE_KEY = 'feiraviva:cliente'

function lerCliente(): Cliente {
  try {
    return { nome: '', telefone: '', entrega: 'retirada', observacao: '', ...JSON.parse(localStorage.getItem(CLIENTE_KEY) ?? '{}') }
  } catch {
    return { nome: '', telefone: '', entrega: 'retirada', observacao: '' }
  }
}

export default function Carrinho() {
  const { itens, alterar, remover, limparProdutor } = useCart()
  const [cliente, setCliente] = useState<Cliente>(lerCliente)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviados, setEnviados] = useState<string[]>([])

  const grupos = agruparPorProdutor(itens)
  const atualizar = (campo: keyof Cliente, valor: string) => setCliente((c) => ({ ...c, [campo]: valor }))

  async function enviar(grupo: CartGroup) {
    setErro(null)
    if (cliente.nome.trim().length < 2) {
      setErro('Informe seu nome antes de enviar o pedido.')
      document.getElementById('cliente-nome')?.focus()
      return
    }
    // abre a aba já no clique para o navegador não bloquear como pop-up
    const aba = window.open('', '_blank')
    setEnviando(grupo.produtorId)
    try {
      const pedido = await api.enviarPedido({
        produtor_id: grupo.produtorId,
        cliente_nome: cliente.nome.trim(),
        cliente_telefone: cliente.telefone.trim() || null,
        entrega: cliente.entrega,
        observacao: cliente.observacao.trim() || null,
        itens: grupo.itens.map((i) => ({ product_id: i.productId, quantidade: i.quantidade })),
      })
      try {
        localStorage.setItem(CLIENTE_KEY, JSON.stringify(cliente))
      } catch {
        /* ignora */
      }
      if (aba) aba.location.href = pedido.whatsapp_url
      else window.location.href = pedido.whatsapp_url
      limparProdutor(grupo.produtorId)
      setEnviados((e) => [...e, grupo.produtorNome])
    } catch (e) {
      aba?.close()
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o pedido')
    } finally {
      setEnviando(null)
    }
  }

  return (
    <>
      <PageTitle eyebrow="Seu pedido" title="Carrinho">
        Cada produtor recebe o próprio pedido no WhatsApp. Pagamento e entrega são combinados com ele.
      </PageTitle>

      {enviados.length > 0 && (
        <div role="status" className="mb-4 rounded-xl border border-zap/30 bg-zap/10 px-4 py-3 text-sm text-folha-900">
          Pedido aberto no WhatsApp de {enviados.join(' e ')}. É só tocar em enviar na conversa.
        </div>
      )}
      {erro && (
        <div className="mb-4">
          <ErrorBox message={erro} />
        </div>
      )}

      {grupos.length === 0 ? (
        <Empty title="Seu carrinho está vazio">
          <Link to="/" className="btn-primary mt-3">
            Ver a vitrine
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {grupos.map((g) => (
              <section key={g.produtorId} className="card p-5" aria-label={`Pedido para ${g.produtorNome}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <Link to={`/produtores/${g.produtorId}`} className="font-display text-xl font-semibold hover:text-folha-600">
                    {g.produtorNome}
                  </Link>
                  <button type="button" onClick={() => limparProdutor(g.produtorId)} className="text-xs text-folha-900/50 hover:text-terra-600">
                    Remover tudo
                  </button>
                </div>
                <ul className="divide-y divide-palha-200">
                  {g.itens.map((i) => (
                    <li key={i.productId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                      <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                        <p className="truncate font-medium">{i.nome}</p>
                        <p className="text-xs text-folha-900/60">
                          {brl(i.preco)} / {i.unidade}
                        </p>
                      </div>
                      <div className="flex items-center rounded-xl border border-palha-200">
                        <button type="button" aria-label={`Diminuir ${i.nome}`} onClick={() => alterar(i.productId, i.quantidade - passo(i.unidade))} className="px-3 py-1.5 text-lg leading-none">
                          −
                        </button>
                        <span className="min-w-12 text-center text-sm font-semibold" aria-live="polite">
                          {quantidade(i.quantidade)} {i.unidade}
                        </span>
                        <button type="button" aria-label={`Aumentar ${i.nome}`} onClick={() => alterar(i.productId, i.quantidade + passo(i.unidade))} className="px-3 py-1.5 text-lg leading-none">
                          +
                        </button>
                      </div>
                      <p className="ml-auto w-20 text-right text-sm font-semibold sm:ml-0">{brl(subtotal(i))}</p>
                      <button type="button" aria-label={`Remover ${i.nome}`} onClick={() => remover(i.productId)} className="text-folha-900/40 hover:text-terra-600">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-col gap-3 border-t border-palha-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-lg">
                    Total <strong className="font-semibold">{brl(g.total)}</strong>
                  </p>
                  <button type="button" onClick={() => enviar(g)} disabled={enviando !== null} className="btn-zap">
                    {enviando === g.produtorId ? 'Abrindo WhatsApp…' : 'Enviar pedido no WhatsApp'}
                  </button>
                </div>
              </section>
            ))}
          </div>

          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <h2 className="mb-4 font-display text-lg font-semibold">Seus dados</h2>
            <div className="flex flex-col gap-4">
              <label>
                <span className="label">Nome *</span>
                <input id="cliente-nome" className="input" value={cliente.nome} onChange={(e) => atualizar('nome', e.target.value)} autoComplete="name" />
              </label>
              <label>
                <span className="label">Telefone (opcional)</span>
                <input className="input" value={cliente.telefone} onChange={(e) => atualizar('telefone', e.target.value)} inputMode="tel" autoComplete="tel" />
              </label>
              <fieldset>
                <legend className="label">Entrega</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['retirada', 'Retirar na feira'],
                      ['entrega', 'Combinar entrega'],
                    ] as const
                  ).map(([valor, texto]) => (
                    <label key={valor} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm ${cliente.entrega === valor ? 'border-folha-700 bg-folha-50 font-semibold' : 'border-palha-200'}`}>
                      <input type="radio" name="entrega" value={valor} checked={cliente.entrega === valor} onChange={() => atualizar('entrega', valor)} className="sr-only" />
                      {texto}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                <span className="label">Observação</span>
                <textarea className="input min-h-20" value={cliente.observacao} onChange={(e) => atualizar('observacao', e.target.value)} maxLength={300} placeholder="Ex.: tomate mais maduro" />
              </label>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
