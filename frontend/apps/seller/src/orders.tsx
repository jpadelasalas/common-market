import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import {
  ApiFailure,
  ConfirmDialog,
  LoadError,
  Loading,
  Photo,
  StatusBadge,
  call,
  money,
  useApi,
  useHost,
  when,
  type Paged,
  type SellerOrderDetail,
  type SellerOrderRow,
} from '@common-market/ui'

const TABS = [
  ['', 'All'],
  ['placed', 'Placed'],
  ['processing', 'Processing'],
  ['shipped', 'Shipped'],
] as const

/** UI-09 order queue. Tab, search and sort live in the URL (filters survive navigation). */
export function OrderQueue({ shop }: { shop: string }) {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const query = new URLSearchParams({ per_page: '50', sort, ...(status && { status }), ...(q && { q }) })
  const list = useApi<Paged<SellerOrderRow, { counts: Record<string, number> }>>(`/seller/orders?${query}`)
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: k === 'q' })
  }
  const counts = list.data?.meta.counts ?? {}
  const all = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <main className="page work">
      <h1>Orders</h1>
      <p className="muted">Manage fulfilment for {shop}.</p>
      <div className="filter-tabs" role="group" aria-label="Order status">
        {TABS.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => set('status', value)}>
            {label} ({value ? (counts[value] ?? 0) : all})
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="field grow">
          <span>Search orders</span>
          <input type="search" placeholder="Order ID or buyer" defaultValue={q} onChange={(e) => set('q', e.target.value.trim())} />
        </label>
        <label className="field">
          <span className="visually-hidden">Sort</span>
          <select value={sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : list.data.data.length === 0 ? (
        <p className="muted empty">No orders match. Try another tab or clear the search.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Buyer</th>
                <th scope="col">Items</th>
                <th scope="col" className="num">Total</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order" className="money">{o.reference}</td>
                  <td data-label="Buyer">{o.buyer_name}</td>
                  <td data-label="Items">
                    {o.item_count} {o.item_count === 1 ? 'item' : 'items'}
                  </td>
                  <td data-label="Total" className="num money">{money(o.total_centavos)}</td>
                  <td data-label="Status">
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <Link className="btn" to={o.id} aria-label={`View order ${o.reference}`}>
                      View order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Showing {list.data.data.length} demo orders · Your shop's orders only.</p>
        </>
      )}
    </main>
  )
}

const NEXT = {
  placed: { to: 'processing', label: 'Start processing' },
  processing: { to: 'shipped', label: 'Mark shipped' },
  shipped: { to: 'delivered', label: 'Mark delivered (demo)' },
} as const

const EVENT_TEXT: Record<string, string> = {
  placed: 'Order placed',
  processing: 'Processing started',
  shipped: 'Shipped',
  delivered: 'Delivered (demo)',
  cancelled: 'Cancelled',
}

/** UI-10 seller order: the next allowed step is the primary action (AC-16, AC-17). */
export function OrderDetail() {
  const { id = '' } = useParams()
  const host = useHost()
  const order = useApi<{ data: SellerOrderDetail }>(`/seller/orders/${encodeURIComponent(id)}`)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [dispatch, setDispatch] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  if (order.error?.status === 404)
    return (
      <main className="page work">
        <h1>Order not found</h1>
        <p className="muted">It does not exist or belongs to another shop.</p>
        <Link to=".." relative="path">Back to orders</Link>
      </main>
    )
  if (order.error) return <main className="page work"><LoadError error={order.error} onRetry={order.reload} /></main>
  if (!order.data) return <main className="page work"><Loading /></main>
  const o = order.data.data
  const next = o.status in NEXT ? NEXT[o.status as keyof typeof NEXT] : null

  async function advance() {
    if (!next) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await call<{ data: SellerOrderDetail }>(host, `/seller/orders/${o.id}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ to: next.to, expected_version: o.version, dispatch_reference: dispatch || null }),
      })
      order.setData(res)
      setDispatch('')
    } catch (e) {
      setNotice((e as ApiFailure).message)
      order.reload() // stale or invalid: show what the order is now
    } finally {
      setBusy(false)
    }
  }

  async function cancel(reason: string) {
    setBusy(true)
    setCancelError(null)
    try {
      await call(host, `/seller-orders/${o.id}/cancel`, { method: 'POST', body: JSON.stringify({ expected_version: o.version, reason: reason || null }) })
      setConfirming(false)
      order.reload()
    } catch (e) {
      setCancelError((e as ApiFailure).message)
      order.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page work">
      <p className="breadcrumbs muted">
        <Link to=".." relative="path">Orders</Link> / {o.reference}
      </p>
      <div className="title-row">
        <div>
          <h1>Order {o.reference}</h1>
          <p className="muted">
            Part of purchase {o.purchase_reference} · Placed {when(o.placed_at)}
          </p>
          <StatusBadge status={o.status} />
        </div>
        {next && (
          <div className="next-action">
            {next.to === 'shipped' && (
              <label className="field">
                <span>Dispatch reference (optional)</span>
                <input value={dispatch} maxLength={64} onChange={(e) => setDispatch(e.target.value)} />
              </label>
            )}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={advance}>
              {busy ? 'Saving…' : next.label}
            </button>
          </div>
        )}
      </div>
      {notice && (
        <p className="notice notice-error" role="alert">
          {notice}
        </p>
      )}
      {o.status === 'cancelled' && (
        <div className="notice notice-warning">
          <strong>Cancelled by {o.cancelled_by === 'buyer' ? 'the buyer' : 'your shop'}</strong>
          {o.cancel_reason && <span>Reason: {o.cancel_reason}</span>}
          <span>Stock was returned and a demo refund was recorded.</span>
        </div>
      )}

      <div className="two-col">
        <div className="stack">
          <section className="card" aria-labelledby="items-title">
            <h2 id="items-title">Items</h2>
            <ul className="item-rows">
              {o.items.map((i) => (
                <li key={i.product_id}>
                  <Photo src={i.image_url} alt={i.title} className="thumb" />
                  <div>
                    <strong>{i.title}</strong>
                    <span className="muted">
                      Quantity {i.quantity} · {money(i.unit_price_centavos)} each · {i.sku}
                    </span>
                  </div>
                  <span className="money">{money(i.line_total_centavos)}</span>
                </li>
              ))}
            </ul>
            <dl className="lines totals">
              <dt>Items</dt>
              <dd className="money">{money(o.items_centavos)}</dd>
              <dt>Delivery</dt>
              <dd className="money">{money(o.delivery_centavos)}</dd>
              <div className="line strong">
                <dt>Total</dt>
                <dd className="money">{money(o.total_centavos)}</dd>
              </div>
            </dl>
          </section>
          <section className="card" aria-labelledby="history-title">
            <h2 id="history-title">Order history</h2>
            <ol className="history">
              {[...o.events].reverse().map((e) => (
                <li key={e.at + e.to_status}>
                  <strong>{EVENT_TEXT[e.to_status]}</strong>
                  <span className="muted">
                    {when(e.at)} · {e.actor === 'buyer' ? o.buyer_name : o.seller.name}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="stack">
          <section className="card" aria-labelledby="deliver-title">
            <h2 id="deliver-title">Deliver to</h2>
            <p>
              {o.address.recipient_name}
              <br />
              {o.address.address_line}
              <br />
              {o.address.city} {o.address.postcode}
            </p>
            {o.address.delivery_note && <p className="muted">Note: {o.address.delivery_note}</p>}
            {o.dispatch_reference && <p className="muted">Dispatch ref. {o.dispatch_reference}</p>}
          </section>
          {o.cancellable && (
            <>
              <div className="notice notice-info">
                <strong>Before you ship</strong>
                <span>Check the items and delivery address. Shipping updates are tracked in this demo.</span>
              </div>
              <button type="button" className="btn btn-danger btn-block" onClick={() => setConfirming(true)}>
                Cancel shop order
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Cancel order ${o.reference}?`}
        actionLabel="Cancel shop order"
        busyLabel="Cancelling…"
        destructive
        busy={busy}
        error={cancelError}
        reasonLabel="Reason shown to the buyer (optional)"
        onConfirm={cancel}
        onClose={() => {
          setConfirming(false)
          setCancelError(null)
        }}
      >
        <p>The items go back into your stock and the buyer's {money(o.total_centavos)} is marked as a demo refund.</p>
        <p>The buyer's orders from other shops are not affected.</p>
      </ConfirmDialog>
    </main>
  )
}
