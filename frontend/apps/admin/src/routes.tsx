import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router'
import { CONTRACT_MAJOR, type HostServices, type RemoteMeta } from '@common-market/contracts'
import { HostProvider, useSession } from '@common-market/ui'
import { ApplicationQueue, ApplicationReview } from './approvals.tsx'
import { Moderation } from './moderation.tsx'
import { OrderOversight, PurchaseInspection } from './oversight.tsx'
import '@common-market/ui/ui.css'
import './admin.css'

// This remote owns /admin/* (architecture.md). Links outside the remote's own <Routes> (side nav,
// not-found) must be absolute: inside the shell's splat route, React Router 7 resolves relative
// links against the full current URL, so 'orders' on /admin/orders became /admin/orders/orders.
const BASE = '/admin'

export const meta: RemoteMeta = { name: 'admin', contractMajor: CONTRACT_MAJOR }

/** Mounted by the shell at /admin/*; relative links resolve below that mount. */
export default function AdminRoutes({ host }: { host: HostServices }) {
  return (
    <HostProvider value={host}>
      <Platform />
    </HostProvider>
  )
}

/** Administrators only; the API enforces the same rule, this explains it (UI ≠ authorization). */
function Platform() {
  const { user } = useSession()
  const location = useLocation()

  if (!user?.roles.includes('admin'))
    return (
      <main className="page narrow">
        <h1>Administration</h1>
        <p className="muted">Sign in with the administrator demo account to review sellers, moderate listings and inspect orders.</p>
        <Link className="btn btn-primary" to={`/sign-in?return=${encodeURIComponent(location.pathname)}`}>
          {user ? 'Switch to administrator' : 'Sign in'}
        </Link>
      </main>
    )

  return (
    <div className="workspace">
      <nav className="side-nav" aria-label="Administration">
        <p className="eyebrow">Platform</p>
        <NavLink to={`${BASE}/applications`}>Seller approvals</NavLink>
        <NavLink to={`${BASE}/moderation`}>Moderation</NavLink>
        <NavLink to={`${BASE}/orders`}>Orders</NavLink>
        <p className="muted side-note">Portfolio demo · v{import.meta.env.VITE_RELEASE}</p>
      </nav>
      <Routes>
        <Route index element={<Navigate to="applications" replace />} />
        <Route path="applications" element={<ApplicationQueue />} />
        <Route path="applications/:id" element={<ApplicationReview />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="orders" element={<OrderOversight />} />
        <Route path="orders/:id" element={<PurchaseInspection />} />
        <Route
          path="*"
          element={
            <main className="page work">
              <h1>Page not found</h1>
              <Link to={`${BASE}/applications`}>Back to seller approvals</Link>
            </main>
          }
        />
      </Routes>
    </div>
  )
}
