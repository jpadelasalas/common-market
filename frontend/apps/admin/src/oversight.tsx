import { Link, useParams, useSearchParams } from 'react-router'
import { LoadError, Loading, StatusBadge, money, useApi, when, type Paged, type PurchaseDetail, type PurchaseSummary } from '@common-market/ui'

type AdminPurchase = PurchaseSummary & { buyer_name: string }

/** UI-16 order oversight (AC-20): payment and per-shop fulfilment are shown separately. Read-only. */
export function OrderOversight() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const payment = params.get('payment') ?? ''
  const query = new URLSearchParams({ per_page: '50', ...(q && { q }), ...(payment && { payment }) })
  const list = useApi<Paged<AdminPurchase>>(`/admin/purchases?${query}`)
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: k === 'q' })
  }

  return (
    <main className="page work">
      <h1>Orders</h1>
      <p className="muted">Inspect purchases across shops. Oversight is read-only; shops and buyers change order status.</p>
      <div className="toolbar">
        <label className="field grow">
          <span>Search purchases</span>
          <input type="search" placeholder="CM number or buyer" defaultValue={q} onChange={(e) => set('q', e.target.value.trim())} />
        </label>
        <label className="field">
          <span>Demo payment</span>
          <select value={payment} onChange={(e) => set('payment', e.target.value)}>
            <option value="">All</option>
            <option value="succeeded">Paid</option>
            <option value="partially_refunded">Partially refunded</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : list.data.data.length === 0 ? (
        <p className="muted empty">No purchases match.</p>
      ) : (
        <ul className="purchase-rows">
          {list.data.data.map((p) => (
            <li key={p.id} className="card">
              <div className="purchase-head">
                <div>
                  <strong className="money">{p.reference}</strong>
                  <span className="muted">
                    {' '}
                    · {p.buyer_name} · {when(p.placed_at)}
                  </span>
                </div>
                <span className="money">{money(p.total_centavos)}</span>
              </div>
              <dl className="status-pair">
                <dt>Demo payment</dt>
                <dd>
                  <StatusBadge status={p.payment_status} />
                </dd>
                <dt>Fulfilment</dt>
                <dd>
                  <StatusBadge status={p.fulfilment} />
                </dd>
              </dl>
              <ul className="shop-statuses" aria-label={`${p.reference} shop orders`}>
                {p.seller_orders.map((o) => (
                  <li key={o.id}>
                    {o.seller.name} <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
              <Link className="btn" to={p.id} aria-label={`Inspect ${p.reference}`}>
                Inspect purchase
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

/** UI-16 selected purchase detail. */
export function PurchaseInspection() {
  const { id = '' } = useParams()
  const purchase = useApi<{ data: PurchaseDetail & { buyer_name: string } }>(`/admin/purchases/${encodeURIComponent(id)}`)

  if (purchase.error?.status === 404)
    return (
      <main className="page work">
        <h1>Purchase not found</h1>
        <Link to=".." relative="path">
          Back to orders
        </Link>
      </main>
    )
  if (purchase.error) return <main className="page work"><LoadError error={purchase.error} onRetry={purchase.reload} /></main>
  if (!purchase.data) return <main className="page work"><Loading /></main>
  const p = purchase.data.data

  return (
    <main className="page work">
      <p className="breadcrumbs muted">
        <Link to=".." relative="path">
          Orders
        </Link>{' '}
        / {p.reference}
      </p>
      <h1>Purchase {p.reference}</h1>
      <p className="muted">
        {p.buyer_name} · {when(p.placed_at)} · {money(p.total_centavos)}
      </p>
      <dl className="status-pair">
        <dt>Demo payment</dt>
        <dd>
          <StatusBadge status={p.payment.status} />
        </dd>
        <dt>Fulfilment</dt>
        <dd>
          <StatusBadge status={p.fulfilment} />
        </dd>
      </dl>
      <div className="two-col">
        <div className="stack">
          {p.seller_orders.map((o) => (
            <section key={o.id} className="card" aria-labelledby={`o-${o.id}`}>
              <div className="card-head">
                <div>
                  <h2 id={`o-${o.id}`}>{o.seller.name}</h2>
                  <span className="muted">Order {o.reference}</span>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <ul className="plain-lines">
                {o.items.map((i) => (
                  <li key={i.product_id}>
                    <span>
                      {i.quantity} × {i.title} <span className="muted">{i.sku}</span>
                    </span>
                    <span className="money">{money(i.line_total_centavos)}</span>
                  </li>
                ))}
              </ul>
              <p className="muted">
                Total incl. delivery <span className="money">{money(o.total_centavos)}</span>
              </p>
              {o.cancel_reason && <p className="muted">Cancelled by {o.cancelled_by}: {o.cancel_reason}</p>}
              <ol className="history">
                {o.events.map((e) => (
                  <li key={e.at + e.to_status}>
                    <strong>{e.to_status.charAt(0).toUpperCase() + e.to_status.slice(1)}</strong>
                    <span className="muted">
                      {when(e.at)} · {e.actor === 'buyer' ? p.buyer_name : o.seller.name}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className="card" aria-labelledby="address-title">
          <h2 id="address-title">Delivery address</h2>
          <p>
            {p.address.recipient_name}
            <br />
            {p.address.address_line}
            <br />
            {p.address.city} {p.address.postcode}
          </p>
          <p className="muted">Shown for oversight only. Status changes belong to the shop or buyer.</p>
        </section>
      </div>
    </main>
  )
}
