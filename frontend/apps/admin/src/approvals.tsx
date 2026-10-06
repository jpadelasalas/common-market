import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import {
  ApiFailure,
  LoadError,
  Loading,
  Photo,
  StatusBadge,
  call,
  useApi,
  useHost,
  useSession,
  when,
  type ApplicationDetail,
  type ApplicationSummary,
  type Paged,
} from '@common-market/ui'

const TABS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
] as const

/** UI-13 approval queue. */
export function ApplicationQueue() {
  const [params, setParams] = useSearchParams()
  const state = params.get('state') ?? 'pending'
  const list = useApi<Paged<ApplicationSummary, { counts: Record<string, number> }>>(`/admin/seller-applications?state=${state}&per_page=50`)
  const counts = list.data?.meta.counts ?? {}
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <main className="page work">
      <h1>Seller approvals</h1>
      <p className="muted">Review shops before they can publish listings.</p>
      <div className="filter-tabs" role="group" aria-label="Application status">
        {TABS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={state === value} onClick={() => setParams(value === 'pending' ? {} : { state: value })}>
            {label} ({value === 'all' ? total : (counts[value] ?? 0)})
          </button>
        ))}
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : list.data.data.length === 0 ? (
        <p className="muted empty">{state === 'pending' ? 'No applications are waiting for review.' : 'No applications in this view.'}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Shop</th>
              <th scope="col">Contact</th>
              <th scope="col">Category</th>
              <th scope="col">Submitted</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data.data.map((a) => (
              <tr key={a.id}>
                <td data-label="Shop">
                  <strong>{a.shop.name}</strong> <span className="muted money">{a.reference}</span>
                </td>
                <td data-label="Contact">{a.contact_name}</td>
                <td data-label="Category">{a.category_label}</td>
                <td data-label="Submitted">{when(a.submitted_at)}</td>
                <td data-label="Status">
                  <StatusBadge status={a.state} />
                </td>
                <td>
                  <Link className="btn" to={a.id} aria-label={`Review ${a.shop.name}`}>
                    {a.state === 'pending' ? 'Review' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

const ACTION_TEXT: Record<string, string> = {
  'seller_application.approved': 'Approved',
  'seller_application.rejected': 'Rejected',
}

/** UI-14 application review (AC-18): rejection needs a reason the applicant can understand. */
export function ApplicationReview() {
  const { id = '' } = useParams()
  const host = useHost()
  const { user } = useSession()
  const app = useApi<{ data: ApplicationDetail }>(`/admin/seller-applications/${encodeURIComponent(id)}`)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  if (app.error?.status === 404)
    return (
      <main className="page work">
        <h1>Application not found</h1>
        <Link to=".." relative="path">
          Back to seller approvals
        </Link>
      </main>
    )
  if (app.error) return <main className="page work"><LoadError error={app.error} onRetry={app.reload} /></main>
  if (!app.data) return <main className="page work"><Loading /></main>
  const a = app.data.data

  async function decide(decision: 'approve' | 'reject') {
    setReasonError(null)
    setNotice(null)
    if (decision === 'reject' && reason.trim().length < 5) {
      setReasonError('Give a reason the applicant can understand (at least 5 characters).')
      return
    }
    setBusy(decision)
    try {
      const res = await call<{ data: ApplicationDetail }>(host, `/admin/seller-applications/${a.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason: reason.trim() || null, expected_version: a.version }),
      })
      app.setData(res)
    } catch (e) {
      const failure = e as ApiFailure
      if (failure.status === 422) setReasonError(failure.body?.errors?.reason?.[0] ?? failure.message)
      else {
        setNotice(failure.message)
        app.reload()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="page work">
      <p className="breadcrumbs muted">
        <Link to=".." relative="path">
          Seller approvals
        </Link>{' '}
        / {a.shop.name}
      </p>
      <h1>Review {a.shop.name}</h1>
      <p className="muted">
        Application {a.reference} · Submitted {when(a.submitted_at)}
      </p>
      <StatusBadge status={a.state} />
      {notice && (
        <p className="notice notice-error" role="alert">
          {notice}
        </p>
      )}

      <div className="two-col">
        <section className="card" aria-labelledby="shop-title">
          <h2 id="shop-title">Shop information</h2>
          <dl className="details">
            <dt>Shop name</dt>
            <dd>{a.shop.name}</dd>
            <dt>Contact</dt>
            <dd>{a.contact_name}</dd>
            <dt>Email</dt>
            <dd>{a.contact_email}</dd>
            <dt>Category</dt>
            <dd>{a.category_label}</dd>
          </dl>
          <h3>About the shop</h3>
          <p className="muted">{a.about}</p>
          <h3>Proposed product range</h3>
          <Photo src={a.sample_image_url} alt={`${a.shop.name} sample product`} className="sample-photo" />
        </section>

        <div className="stack">
          {a.state === 'pending' ? (
            <section className="card form-grid" aria-labelledby="decision-title">
              <h2 id="decision-title">Make a decision</h2>
              <p className="muted">Approval lets this shop publish listings. Rejection needs a reason the applicant can understand.</p>
              <label className="field">
                <span>Reason (required to reject)</span>
                <textarea
                  value={reason}
                  maxLength={500}
                  aria-invalid={!!reasonError}
                  aria-describedby={reasonError ? 'reason-error' : undefined}
                  onChange={(e) => setReason(e.target.value)}
                />
                {reasonError && (
                  <span id="reason-error" className="field-error">
                    {reasonError}
                  </span>
                )}
              </label>
              <button type="button" className="btn btn-primary btn-block" disabled={!!busy} onClick={() => decide('approve')}>
                {busy === 'approve' ? 'Approving…' : 'Approve seller'}
              </button>
              <button type="button" className="btn btn-block" disabled={!!busy} onClick={() => decide('reject')}>
                {busy === 'reject' ? 'Rejecting…' : 'Reject application'}
              </button>
              <p className="muted">Decision recorded as {user?.name}.</p>
            </section>
          ) : (
            <section className="card" aria-labelledby="decision-title">
              <h2 id="decision-title">Decision</h2>
              <p>
                <StatusBadge status={a.state} /> by {a.reviewer} · {a.reviewed_at && when(a.reviewed_at)}
              </p>
              {a.review_reason && <p className="muted">Reason: {a.review_reason}</p>}
            </section>
          )}
          {a.history.length > 0 && (
            <section className="card" aria-labelledby="history-title">
              <h2 id="history-title">History</h2>
              <ol className="history">
                {a.history.map((h) => (
                  <li key={h.at + h.action}>
                    <strong>{ACTION_TEXT[h.action] ?? h.action}</strong>
                    <span className="muted">
                      {when(h.at)} · {h.actor}
                    </span>
                    {h.reason && <span className="muted">Reason: {h.reason}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
