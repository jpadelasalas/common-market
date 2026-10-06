import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { isSafeInternalPath } from './safePath.ts'
import { signIn, signOut, useSession } from './session.ts'

// Seeded fictional accounts (backend/README.md); local demo only.
const DEMO_PASSWORD = 'demo-password'
const demoAccounts = [
  { role: 'Buyer', who: 'Alex Rivera', email: 'alex@demo.test', home: '/' },
  { role: 'Seller', who: 'Kubo Living', email: 'mara@demo.test', home: '/seller' },
  { role: 'Administrator', who: 'Admin Demo', email: 'admin@demo.test', home: '/admin' },
]

/** UI-17: shell-owned sign-in with a safe return path (AC-23). */
export function SignIn() {
  const navigate = useNavigate()
  const { user } = useSession()
  const requested = useSearchParams()[0].get('return') ?? ''
  const returnTo = isSafeInternalPath(requested) && !requested.startsWith('/sign-in') ? requested : null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(emailValue: string, passwordValue: string, home = '/') {
    setBusy(true)
    setError(null)
    // Switching accounts starts a clean session (security matrix: sign out before switching).
    if (user) await signOut()
    const message = await signIn(emailValue, passwordValue)
    setBusy(false)
    if (message) setError(message)
    else navigate(returnTo ?? home, { replace: true })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(email, password)
  }

  return (
    <main className="page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <p className="eyebrow">Your Common Market account</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p className="muted">Sign in to shop, manage your store or review the marketplace.</p>

        <form onSubmit={onSubmit} noValidate>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby={error ? 'sign-in-error' : undefined} />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && (
            <p id="sign-in-error" className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <h2 className="auth-subtitle">Try a demo account</h2>
        <p className="muted">Choose a role to explore the portfolio. No personal details or real payments are needed.</p>
        <ul className="demo-accounts">
          {demoAccounts.map((a) => (
            <li key={a.email}>
              <div>
                <strong>{a.role}</strong>
                <span className="muted">{a.who}</span>
              </div>
              <button type="button" className="btn" disabled={busy} onClick={() => submit(a.email, DEMO_PASSWORD, a.home)}>
                Use {a.role.toLowerCase()}
              </button>
            </li>
          ))}
        </ul>
        <div className="notice">
          <strong>Demo session</strong>
          <span>Switching accounts starts a new role session. Your buyer cart is restored when you return.</span>
        </div>
      </section>
    </main>
  )
}
