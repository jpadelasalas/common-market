import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiFailure, LoadError, Loading, Photo, StatusBadge, call, money, useApi, useHost, when, type ModeratedListing, type Paged } from '@common-market/ui'

/**
 * UI-15 listing moderation (AC-19). Inspecting a listing opens a side panel with an explicit reason
 * field; unpublishing hides it from shoppers while purchase records stay unchanged.
 */
export function Moderation() {
  const host = useHost()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const visibility = params.get('visibility') ?? ''
  const query = new URLSearchParams({ per_page: '100', ...(q && { q }), ...(visibility && { visibility }) })
  const list = useApi<Paged<ModeratedListing>>(`/admin/products?${query}`)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const panelHeading = useRef<HTMLHeadingElement>(null)

  // On narrow screens the panel sits below a long list: bring it into view and move focus to it.
  useEffect(() => {
    if (!selectedId || !panelHeading.current) return
    panelHeading.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    panelHeading.current.focus({ preventScroll: true })
  }, [selectedId])

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: k === 'q' })
  }
  const selected = list.data?.data.find((p) => p.id === selectedId) ?? null

  function inspect(p: ModeratedListing) {
    setSelectedId(p.id)
    setReason('')
    setError(null)
    setDone(null)
  }

  async function act(action: 'unpublish' | 'clear') {
    if (!selected) return
    if (reason.trim().length < 5) return setError('Give a reason the seller can act on (at least 5 characters).')
    setBusy(true)
    setError(null)
    try {
      await call(host, `/admin/products/${selected.id}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: reason.trim(), expected_version: selected.version }),
      })
      setDone(action === 'unpublish' ? 'Listing unpublished. Buyers can no longer see it; past orders are unchanged.' : 'Restriction cleared. The seller can publish the listing again.')
      setReason('')
      list.reload()
    } catch (e) {
      const failure = e as ApiFailure
      setError(failure.body?.errors?.reason?.[0] ?? failure.message)
      if (failure.status === 409) list.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page work">
      <h1>Listing moderation</h1>
      <p className="muted">Control visibility without changing historical purchases.</p>
      <div className="toolbar">
        <label className="field grow">
          <span>Search listings</span>
          <input type="search" placeholder="Product name or shop" defaultValue={q} onChange={(e) => set('q', e.target.value.trim())} />
        </label>
        <label className="field">
          <span>Visibility</span>
          <select value={visibility} onChange={(e) => set('visibility', e.target.value)}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="moderated">Moderated</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>

      <div className="two-col">
        <div>
          {list.error ? (
            <LoadError error={list.error} onRetry={list.reload} />
          ) : !list.data ? (
            <Loading />
          ) : list.data.data.length === 0 ? (
            <p className="muted empty">No listings match.</p>
          ) : (
            <ul className="listing-rows">
              {list.data.data.map((p) => (
                <li key={p.id} className={`card ${p.id === selectedId ? 'is-selected' : ''}`}>
                  <Photo src={p.image_url} alt={p.title} className="thumb" />
                  <div>
                    <strong>{p.title}</strong>
                    <span className="muted">{p.seller.name}</span>
                    <span className="money">{money(p.price_centavos)}</span>
                  </div>
                  <StatusBadge status={p.visibility} />
                  <button type="button" className="btn" aria-pressed={p.id === selectedId} onClick={() => inspect(p)}>
                    Inspect listing
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="card form-grid moderation-panel" aria-live="polite" aria-label="Selected listing">
          {!selected ? (
            <p className="muted">Inspect a listing to review it and take action.</p>
          ) : (
            <>
              <h2 ref={panelHeading} tabIndex={-1}>
                {selected.title}
              </h2>
              <p className="muted">
                {selected.seller.name} · <StatusBadge status={selected.visibility} />
              </p>
              {done && (
                <p className="notice" role="status">
                  {done}
                </p>
              )}
              {selected.visibility === 'moderated' && (
                <div className="notice notice-error">
                  <strong>Unpublished by moderation{selected.moderated_at && ` · ${when(selected.moderated_at)}`}</strong>
                  <span>Reason: {selected.moderation_reason}</span>
                </div>
              )}
              {selected.visibility === 'draft' ? (
                <p className="muted">Drafts are not visible to shoppers, so there is nothing to moderate.</p>
              ) : (
                <>
                  <p className="muted">
                    {selected.visibility === 'published'
                      ? 'Unpublishing hides this listing from shoppers. Existing order records stay unchanged.'
                      : 'Clearing the restriction returns the listing to draft; the seller decides when to publish again.'}
                  </p>
                  <label className="field">
                    <span>{selected.visibility === 'published' ? 'Moderation reason *' : 'Clearance note *'}</span>
                    <textarea value={reason} maxLength={500} aria-invalid={!!error} aria-describedby={error ? 'moderation-error' : undefined} onChange={(e) => setReason(e.target.value)} />
                    {error && (
                      <span id="moderation-error" className="field-error">
                        {error}
                      </span>
                    )}
                  </label>
                  <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => act(selected.visibility === 'published' ? 'unpublish' : 'clear')}>
                    {busy ? 'Saving…' : selected.visibility === 'published' ? 'Unpublish listing' : 'Clear restriction'}
                  </button>
                  <p className="muted">The seller can revise the listing. Admin clearance is needed before republishing.</p>
                </>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  )
}
