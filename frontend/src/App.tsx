import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Empty, Spinner } from './components/ui'
import { AuthProvider, useAuth } from './lib/auth'
import { CartProvider } from './lib/useCart'
import Admin from './pages/Admin'
import Carrinho from './pages/Carrinho'
import Entrar from './pages/Entrar'
import Feira from './pages/Feira'
import Feiras from './pages/Feiras'
import Painel from './pages/painel/Painel'
import Produtor from './pages/Produtor'
import Vitrine from './pages/Vitrine'

function Protegida({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/entrar" replace />
  if (admin && user.role !== 'admin') return <Navigate to="/painel" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Vitrine />} />
              <Route path="feiras" element={<Feiras />} />
              <Route path="feiras/:id" element={<Feira />} />
              <Route path="produtores/:id" element={<Produtor />} />
              <Route path="carrinho" element={<Carrinho />} />
              <Route path="entrar" element={<Entrar />} />
              <Route path="painel" element={<Protegida><Painel /></Protegida>} />
              <Route path="admin" element={<Protegida admin><Admin /></Protegida>} />
              <Route path="*" element={<Empty title="Página não encontrada" />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
