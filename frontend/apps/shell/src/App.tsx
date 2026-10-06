import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router'
import { RemoteArea } from './RemoteArea.tsx'
import { SignIn } from './SignIn.tsx'
import { signOut, useSession } from './session.ts'

/** Shell owns the header, sign-in and top-level routing so navigation survives any remote failure. */
export function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/seller/*" element={<RemoteArea key="seller" name="seller" />} />
        <Route path="/admin/*" element={<RemoteArea key="admin" name="admin" />} />
        <Route path="/*" element={<RemoteArea key="storefront" name="storefront" />} />
      </Routes>
    </>
  )
}

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSession()
  const [query, setQuery] = useState('')
  // CMP-01 mobile menu: collapsed behind a button on narrow screens (always visible on wider ones).
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => setMenuOpen(false), [location.pathname])
  const closeOnEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && menuOpen) {
      setMenuOpen(false)
      menuButton.current?.focus()
    }
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/products?q=${encodeURIComponent(query.trim())}`)
  }
  const role = user?.roles[0]
  const returnTo = encodeURIComponent(location.pathname + location.search)

  return (
    <header className="shell-header" onKeyDown={closeOnEscape}>
      <NavLink to="/" className="wordmark">
        common market
      </NavLink>
      <form role="search" onSubmit={search} className="search">
        <label htmlFor="shell-search" className="visually-hidden">
          Search products
        </label>
        <input
          id="shell-search"
          type="search"
          placeholder="Search useful things"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <button
        ref={menuButton}
        type="button"
        className="menu-button"
        aria-expanded={menuOpen}
        aria-controls="main-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        Menu
      </button>
      <nav id="main-nav" aria-label="Main" className={`shell-nav ${menuOpen ? 'open' : ''}`}>
        {role === 'seller' && <NavLink to="/seller">Seller workspace</NavLink>}
        {role === 'admin' && <NavLink to="/admin">Administration</NavLink>}
        {(!role || role === 'buyer') && (
          <>
            <NavLink to="/orders">Orders</NavLink>
            <NavLink to="/cart">Cart</NavLink>
          </>
        )}
        {user ? (
          <span className="account">
            <span className="muted">{user.name}</span>
            <button
              type="button"
              className="link-button"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
            >
              Sign out
            </button>
          </span>
        ) : (
          location.pathname !== '/sign-in' && <Link to={`/sign-in?return=${returnTo}`}>Sign in</Link>
        )}
      </nav>
    </header>
  )
}
