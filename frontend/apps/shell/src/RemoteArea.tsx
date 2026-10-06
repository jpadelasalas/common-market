import { Component, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import type { HostServices } from '@common-market/contracts'
import { createHostServices } from './host.ts'
import { loadArea, type AreaName } from './remotes.ts'

type State =
  | { status: 'loading' }
  | { status: 'ready'; Routes: ComponentType<{ host: HostServices }> }
  | { status: 'failed' }

/** Mounts one remote's route tree; any load or render failure becomes CMP-14 inside the intact shell. */
export function RemoteArea({ name }: { name: AreaName }) {
  const navigate = useNavigate()
  const host = useMemo(() => createHostServices(navigate), [navigate])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    loadArea(name, attempt).then(
      (mod) => live && setState({ status: 'ready', Routes: mod.default }),
      () => live && setState({ status: 'failed' }),
    )
    return () => {
      live = false
    }
  }, [name, attempt])

  const retry = () => setAttempt((n) => n + 1)
  const recovery = <Recovery name={name} onRetry={retry} />

  if (state.status === 'loading')
    return (
      <p className="page muted" role="status">
        Loading…
      </p>
    )
  if (state.status === 'failed') return recovery
  return (
    <AreaBoundary key={attempt} fallback={recovery}>
      <state.Routes host={host} />
    </AreaBoundary>
  )
}

class AreaBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[remote render]', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const copy: Record<AreaName, { label: string; title: string; kept: string; back?: [string, string] }> = {
  storefront: {
    label: 'Storefront',
    title: 'Shopping is temporarily unavailable',
    kept: 'Your cart and signed-in session are kept. Retrying will not place an order.',
  },
  seller: {
    label: 'Seller workspace',
    title: 'Seller workspace is temporarily unavailable',
    kept: 'Your signed-in session is kept. Retrying will not change any order or listing.',
    back: ['/', 'Back to shopping'],
  },
  admin: {
    label: 'Administration',
    title: 'Administration is temporarily unavailable',
    kept: 'Your signed-in session is kept. Retrying will not submit any decision.',
    back: ['/', 'Back to shopping'],
  },
}

/** UI-18 / CMP-14 remote recovery. */
function Recovery({ name, onRetry }: { name: AreaName; onRetry: () => void }) {
  const c = copy[name]
  return (
    <main className="page">
      <section className="recovery" aria-labelledby="recovery-title">
        <p className="eyebrow">{c.label}</p>
        <h1 id="recovery-title">{c.title}</h1>
        <p className="muted">We could not load this part of Common Market. Try again in a moment.</p>
        <div className="notice">
          <strong>Your progress is saved</strong>
          <span>{c.kept}</span>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
          {c.back && (
            <Link className="btn" to={c.back[0]}>
              {c.back[1]}
            </Link>
          )}
        </div>
        <p className="muted">If the problem continues, return later. Reference: {name} unavailable.</p>
      </section>
    </main>
  )
}
