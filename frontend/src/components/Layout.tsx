import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/useCart'

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <span className="font-display text-xl font-semibold text-folha-900">Feira Viva</span>
    </Link>
  )
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-folha-50 text-folha-700' : 'text-folha-900/70 hover:text-folha-900'}`

export default function Layout() {
  const { user, demo } = useAuth()
  const { itens } = useCart()
  const conta = user ? (user.role === 'admin' ? '/admin' : '/painel') : '/entrar'
  const contaLabel = user ? (user.role === 'admin' ? 'Admin' : 'Meu painel') : 'Sou produtor'

  return (
    <div className="flex min-h-dvh flex-col">
      {demo && (
        <div className="bg-folha-900 px-4 py-1.5 text-center text-xs text-palha-100">
          Modo demonstração: dados de exemplo, sem Supabase configurado.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-palha-200 bg-palha-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={linkCls}>
              Vitrine
            </NavLink>
            <NavLink to="/feiras" className={linkCls}>
              Feiras
            </NavLink>
            <NavLink to="/carrinho" className={linkCls}>
              Carrinho{itens.length > 0 && <span className="ml-1.5 rounded-full bg-terra-500 px-1.5 text-xs text-white">{itens.length}</span>}
            </NavLink>
            <NavLink to={conta} className="btn-primary ml-2 py-2">
              {contaLabel}
            </NavLink>
          </nav>
          <NavLink to={conta} className="btn-ghost py-2 md:hidden">
            {contaLabel}
          </NavLink>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-12">
        <Outlet />
      </main>

      <footer className="hidden border-t border-palha-200 py-6 text-center text-xs text-folha-900/50 md:block">
        Feira Viva · Marketplace da Agricultura Familiar e Feiras Livres · Projeto acadêmico iCEV
      </footer>

      {/* barra inferior no celular (RNF01) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-palha-200 bg-white md:hidden">
        <NavLink to="/" end className={({ isActive }) => `py-3 text-center text-sm ${isActive ? 'font-semibold text-folha-700' : 'text-folha-900/60'}`}>
          Início
        </NavLink>
        <NavLink to="/feiras" className={({ isActive }) => `py-3 text-center text-sm ${isActive ? 'font-semibold text-folha-700' : 'text-folha-900/60'}`}>
          Feiras
        </NavLink>
        <NavLink to="/carrinho" className={({ isActive }) => `py-3 text-center text-sm ${isActive ? 'font-semibold text-folha-700' : 'text-folha-900/60'}`}>
          Carrinho{itens.length > 0 ? ` (${itens.length})` : ''}
        </NavLink>
      </nav>
    </div>
  )
}
