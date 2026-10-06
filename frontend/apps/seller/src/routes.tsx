import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { CONTRACT_MAJOR, type HostServices, type RemoteMeta } from '@common-market/contracts'
import { HostProvider, useSession } from '@common-market/ui'
import { OrderDetail, OrderQueue } from './orders.tsx'
import { ProductEditor, ProductList } from './products.tsx'
import '@common-market/ui/ui.css'
import './seller.css'

export const meta: RemoteMeta = { name: 'seller', contractMajor: CONTRACT_MAJOR }

/** Mounted by the shell at /seller/*; relative links resolve below that mount. */
export default function SellerRoutes({ host }: { host: HostServices }) {
  return (
    <HostProvider value={host}>
      <Workspace />
    </HostProvider>
  )
}

/** Approved sellers only; the API enforces the same rule, this is the explanation (UI ≠ authorization). */
function Workspace() {
  const { user } = useSession()
  const location = useLocation()
  const seller = user?.roles.includes('seller') ? user.seller : undefined

  if (!seller || seller.status !== 'approved')
    return (
      <main className="page narrow">
        <h1>Seller workspace</h1>
        {seller ? (
          <p className="muted">
            {seller.name}'s application is {seller.status}. The workspace opens once an administrator approves the shop.
          </p>
        ) : (
          <p className="muted">Sign in with an approved seller account to manage listings, stock and orders.</p>
        )}
        {!seller && (
          <Link className="btn btn-primary" to={`/sign-in?return=${encodeURIComponent(location.pathname)}`}>
            Sign in as a seller
          </Link>
        )}
      </main>
    )

  return (
    <div className="workspace">
      <nav className="side-nav" aria-label="Seller workspace">
        <p className="eyebrow">Your shop</p>
        <NavLink to="orders">Orders</NavLink>
        <NavLink to="products">Products</NavLink>
        <p className="muted side-note">Portfolio demo · v{import.meta.env.VITE_RELEASE}</p>
      </nav>
      <Routes>
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<OrderQueue shop={seller.name} />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductEditor />} />
        <Route path="products/:id" element={<ProductEditor />} />
        <Route
          path="*"
          element={
            <main className="page">
              <h1>Page not found</h1>
              <Link to="orders">Back to orders</Link>
            </main>
          }
        />
      </Routes>
    </div>
  )
}
