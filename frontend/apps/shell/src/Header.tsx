import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import type { SessionUser } from '@common-market/contracts'
import { Icon, type IconName } from './icons.tsx'
import { signOut, useSession } from './session.ts'

/**
 * CMP-01 header, as designed in common-market.pen:
 * - Storefront (`Qsauk` desktop, `i9d1r1` mobile): wordmark, search, Orders, cart and account icons;
 *   on phones the search moves to its own row and only the icons stay beside the wordmark.
 * - Workspaces (UI-09..UI-16): wordmark with the workspace name and the account; on phones a menu
 *   button opens the workspace drawer (`SqIEc`). The account and drawer overlay the page, so they
 *   work from anywhere without scrolling back up.
 */
export function Header() {
  const location = useLocation()
  const { user } = useSession()
  const role = user?.roles[0]
  const workspace =
    location.pathname.startsWith('/seller') && role === 'seller'
      ? WORKSPACES.seller
      : location.pathname.startsWith('/admin') && role === 'admin'
        ? WORKSPACES.admin
        : null

  return workspace && user ? <WorkspaceHeader user={user} workspace={workspace} /> : <StorefrontHeader user={user} />
}

interface Workspace {
  label: string
  title: (user: SessionUser) => string
  links: { to: string; label: string; icon: IconName }[]
}

// The shell owns top-level navigation (architecture.md); these mirror each remote's sections.
const WORKSPACES: Record<'seller' | 'admin', Workspace> = {
  seller: {
    label: 'Seller workspace',
    title: (u) => u.seller?.name ?? 'Your shop',
    links: [
      { to: '/seller/orders', label: 'Orders', icon: 'package' },
      { to: '/seller/products', label: 'Products', icon: 'layers' },
    ],
  },
  admin: {
    label: 'Administration',
    title: () => 'Administration',
    links: [
      { to: '/admin/applications', label: 'Seller approvals', icon: 'store' },
      { to: '/admin/moderation', label: 'Moderation', icon: 'shield' },
      { to: '/admin/orders', label: 'Orders', icon: 'package' },
    ],
  },
}

function Wordmark() {
  return (
    <Link to="/" className="wordmark">
      common market
    </Link>
  )
}

function StorefrontHeader({ user }: { user: SessionUser | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const role = user?.roles[0]
  const shopper = !role || role === 'buyer'

  const search = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/products?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="shell-header">
      <Wordmark />
      <form role="search" onSubmit={search} className="search">
        <label htmlFor="shell-search" className="visually-hidden">
          Search products
        </label>
        <Icon name="search" size={18} />
        <input id="shell-search" type="search" placeholder="Search useful things" value={query} onChange={(e) => setQuery(e.target.value)} />
      </form>
      <nav aria-label="Main" className="shell-nav">
        {role === 'buyer' && (
          <NavLink to="/orders" className="text-link">
            Orders
          </NavLink>
        )}
        {shopper && (
          <NavLink to="/cart" className="icon-link" aria-label="Cart">
            <Icon name="bag" />
            <span className="icon-text">Cart</span>
          </NavLink>
        )}
        {user ? (
          <AccountMenu user={user} />
        ) : (
          <Link to={`/sign-in?return=${encodeURIComponent(location.pathname + location.search)}`} className="icon-link account-trigger" aria-label="Sign in">
            <Icon name="user" />
          </Link>
        )}
      </nav>
    </header>
  )
}

function WorkspaceHeader({ user, workspace }: { user: SessionUser; workspace: Workspace }) {
  const drawer = useRef<HTMLDialogElement>(null)
  const location = useLocation()
  // Close the drawer after navigating from it.
  useEffect(() => drawer.current?.close(), [location.pathname])

  return (
    <header className="shell-header workspace-header">
      <button type="button" className="icon-button menu-button" aria-label="Open workspace menu" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}>
        <Icon name="menu" />
      </button>
      <Wordmark />
      <span className="workspace-label">{workspace.label}</span>
      <nav aria-label="Main" className="shell-nav">
        <AccountMenu user={user} />
      </nav>

      {/* CMP-01 mobile workspace drawer: native <dialog> gives the focus trap, Escape and focus return. */}
      <dialog ref={drawer} className="drawer" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <h2 id="drawer-title">{workspace.title(user)}</h2>
          <button type="button" className="btn" onClick={() => drawer.current?.close()}>
            Close
          </button>
        </div>
        <nav aria-label={`${workspace.label} menu`}>
          {workspace.links.map((l) => (
            <NavLink key={l.to} to={l.to} className="drawer-link">
              <Icon name={l.icon} />
              {l.label}
            </NavLink>
          ))}
          <Link to="/" className="drawer-link">
            <Icon name="store" />
            Back to shopping
          </Link>
        </nav>
        <SignOutButton className="btn btn-block" />
      </dialog>
    </header>
  )
}

/** Account menu (CMP-01 user icon): an overlay popover; Escape or a click outside closes it. */
function AccountMenu({ user }: { user: SessionUser }) {
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const role = user.roles[0]
  useEffect(() => menu.current?.hidePopover?.(), [location.pathname])

  // Place the overlay under its trigger (CSS anchor positioning is not yet universal).
  const place = () => {
    const r = trigger.current?.getBoundingClientRect()
    if (r && menu.current) {
      menu.current.style.top = `${r.bottom + 8}px`
      menu.current.style.right = `${Math.max(16, window.innerWidth - r.right)}px`
    }
  }

  return (
    <>
      <button ref={trigger} type="button" className="icon-link account-trigger" popoverTarget="account-menu" onClick={place} aria-label={`Account: ${user.name}`}>
        <Icon name="user" />
        <span className="account-name">{user.name}</span>
      </button>
      <div ref={menu} id="account-menu" popover="auto" className="account-menu">
        <p className="account-who">
          <strong>{user.name}</strong>
          <span className="muted">{role === 'buyer' ? 'Buyer' : role === 'seller' ? (user.seller?.name ?? 'Seller') : 'Administrator'}</span>
        </p>
        {role === 'buyer' && <Link to="/orders">Your orders</Link>}
        {role === 'seller' && <Link to="/seller">Seller workspace</Link>}
        {role === 'admin' && <Link to="/admin">Administration</Link>}
        {role !== 'buyer' && <Link to="/">Shop</Link>}
        <SignOutButton className="btn btn-block" />
      </div>
    </>
  )
}

function SignOutButton({ className }: { className: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await signOut()
        navigate('/')
      }}
    >
      Sign out
    </button>
  )
}
