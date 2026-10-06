import { Link, Route, Routes } from 'react-router'
import { CONTRACT_MAJOR, type HostServices, type RemoteMeta } from '@common-market/contracts'
import { Discovery, ProductPage, Results } from './catalog.tsx'
import { HostProvider } from '@common-market/ui'
import { OrdersPage, PurchasePage } from './orders.tsx'
import { CartPage, CheckoutPage } from './shopping.tsx'
import '@common-market/ui/ui.css'
import './storefront.css'

export const meta: RemoteMeta = { name: 'storefront', contractMajor: CONTRACT_MAJOR }

/** Mounted by the shell at /*; storefront owns the root routes (architecture.md), so absolute links are safe. */
export default function StorefrontRoutes({ host }: { host: HostServices }) {
  return (
    <HostProvider value={host}>
      <Routes>
        <Route index element={<Discovery />} />
        <Route path="products" element={<Results />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:id" element={<PurchasePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HostProvider>
  )
}

function NotFound() {
  return (
    <main className="page narrow">
      <h1>Page not found</h1>
      <Link className="btn" to="/">
        Back to shopping
      </Link>
    </main>
  )
}
