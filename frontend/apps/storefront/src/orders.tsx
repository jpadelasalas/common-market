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
  type PurchaseDetail,
  type PurchaseSummary,
  type SellerOrder,
} from '@common-market/ui'
import { BuyerOnly } from './components.tsx'
import { Summary, useBuyer } from './shopping.tsx'

/** UI-06 confirmation and UI-08 purchase tracking (AC-06, AC-10, AC-11). */
export function PurchasePage() {
  const buyer = useBuyer()
  const { id = '' } = useParams()
  const placed = useSearchParams()[0].has('placed')
  const purchase = useApi<{ data: PurchaseDetail }>(buyer.ok ? `/purchases/${encodeURIComponent(id)}` : null)

  if (!buyer.ok) return <BuyerOnly signedInAs={buyer.as} />
  if (purchase.error?.status === 404)
    return (
      <main className="page narrow">
        <h1>Order not found</h1>
        <p className="muted">This order does not exist or belongs to another account.</p>
        <Link className="btn" to="/orders">
          Your orders
        </Link>
      </main>
    )
  if (purchase.error) return <main className="page"><LoadError error={purchase.error} onRetry={purchase.reload} /></main>
  if (!purchase.data) return <main className="page"><Loading /></main>
  const p = purchase.data.data
  const shops = p.seller_orders.length

  return (
    <main className="page">
      <p className="breadcrumbs muted">
        <Link to="/orders">Your orders</Link> / {p.reference}
      </p>
      {placed ? (
        <>
          <p className="check-mark" aria-hidden="true">
            ✓
          </p>
          <h1>Your demo order is placed.</h1>
        </>
      ) : (
        <h1>Purchase {p.reference}</h1>
      )}
      <p className="muted">
        {placed && `Purchase ${p.reference} · `}
        {when(p.placed_at)} · {shops} {shops === 1 ? 'shop' : 'shops'}, {shops} separate {shops === 1 ? 'delivery' : 'deliveries'}
      </p>
      {placed && (
        <div className="notice">
          <strong>Demo payment succeeded</strong>
          <span>No money was collected. Each shop will handle its own delivery.</span>
        </div>
      )}
      <div className="two-col">
        <div className="stack">
          {p.seller_orders.map((o) => (
            <SellerOrderPanel key={o.id} order={o} onChanged={purchase.reload} />
          ))}
        </div>
        <div className="stack">
          <Summary groups={p.seller_orders} items={p.items_centavos} total={p.total_centavos}>
            <p className="muted">Demo only. No money was collected.</p>
            <StatusBadge status={p.payment.status} />
          </Summary>
          <section className="card" aria-labelledby="deliver-to">
            <h2 id="deliver-to">Delivering to</h2>
            <p>
              {p.address.recipient_name}
              <br />
              {p.address.address_line}
              <br />
              {p.address.city} {p.address.postcode}
            </p>
            {p.address.delivery_note && <p className="muted">Note: {p.address.delivery_note}</p>}
          </section>
          {placed && (
            <Link className="btn btn-block" to="/products">
              Continue shopping
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

const STEPS = [
  { status: 'placed', label: 'Order placed', at: (o: SellerOrder) => o.placed_at, waiting: '' },
  { status: 'processing', label: 'Processing', at: (o: SellerOrder) => o.events.find((e) => e.to_status === 'processing')?.at ?? null, waiting: 'Waiting for the shop' },
  { status: 'shipped', label: 'Shipped', at: (o: SellerOrder) => o.shipped_at, waiting: 'Not shipped yet' },
  { status: 'delivered', label: 'Delivered', at: (o: SellerOrder) => o.delivered_at, waiting: 'Awaiting delivery' },
] as const

/** One shop's delivery with its own status, timeline and cancellation (AC-10/AC-11). */
function SellerOrderPanel({ order: o, onChanged }: { order: SellerOrder; onChanged(): void }) {
  const host = useHost()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reached = STEPS.findIndex((s) => s.status === o.status)

  async function cancel() {
    setBusy(true)
    setError(null)
    try {
      await call(host, `/seller-orders/${o.id}/cancel`, { method: 'POST', body: JSON.stringify({ expected_version: o.version }) })
      setConfirming(false)
      onChanged()
    } catch (e) {
      const failure = e as ApiFailure
      setError(failure.message)
      // A shipment or other change won the race: show the current state behind the dialog.
      if (failure.status === 409) onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-labelledby={`order-${o.id}`}>
      <div className="card-head">
        <div>
          <h2 id={`order-${o.id}`}>{o.seller.name}</h2>
          <span className="muted">Order {o.reference}</span>
        </div>
        <StatusBadge status={o.status} />
      </div>
      <ul className="order-lines">
        {o.items.map((i) => (
          <li key={i.product_id}>
            <Photo src={i.image_url} alt={i.title} className="thumb" />
            <span>
              {i.quantity} × {i.title}
            </span>
            <span className="money">{money(i.line_total_centavos)}</span>
          </li>
        ))}
      </ul>
      <dl className="lines group-foot">
        <dt>Delivery</dt>
        <dd className="money">{money(o.delivery_centavos)}</dd>
        <div className="line strong">
          <dt>Total incl. delivery</dt>
          <dd className="money">{money(o.total_centavos)}</dd>
        </div>
      </dl>

      {o.status === 'cancelled' ? (
        <div className="notice notice-warning">
          <strong>Cancelled by {o.cancelled_by === 'buyer' ? 'you' : o.seller.name}</strong>
          {o.cancel_reason && <span>Reason: {o.cancel_reason}</span>}
          <span>
            {o.cancelled_at && when(o.cancelled_at)} · Stock returned to the shop and {money(o.total_centavos)} marked as a demo refund.
          </span>
        </div>
      ) : (
        <ol className="steps" aria-label={`${o.seller.name} delivery progress`}>
          {STEPS.map((s, i) => {
            const at = s.at(o)
            return (
              <li key={s.status} className={i < reached ? 'done' : i === reached ? 'current' : undefined} aria-current={i === reached ? 'step' : undefined}>
                <span className="dot" aria-hidden="true" />
                <span>
                  {s.label}
                  <span className="muted">{at ? when(at) : s.waiting}</span>
                  {s.status === 'shipped' && o.dispatch_reference && <span className="muted">Dispatch ref. {o.dispatch_reference}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {o.status !== 'cancelled' && (
        <div className="cancel-row">
          <span className="muted">
            {o.cancellable ? 'Cancellation is available until this shop ships.' : 'This shop has shipped, so it can no longer be cancelled.'}
          </span>
          {o.cancellable && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
              Cancel shop order
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Cancel the ${o.seller.name} order?`}
        actionLabel="Cancel shop order"
        busyLabel="Cancelling…"
        destructive
        busy={busy}
        error={error}
        onConfirm={cancel}
        onClose={() => {
          setConfirming(false)
          setError(null)
        }}
      >
        <p>Only {o.reference} is cancelled. Other shops in this purchase keep delivering.</p>
        <p>The items go back into stock and {money(o.total_centavos)} is marked as a demo refund. No money moves.</p>
      </ConfirmDialog>
    </section>
  )
}

const TABS = [
  { key: 'all', label: 'All orders', match: () => true },
  { key: 'open', label: 'In progress', match: (p: PurchaseSummary) => p.fulfilment === 'placed' || p.fulfilment === 'in_progress' },
  { key: 'done', label: 'Completed', match: (p: PurchaseSummary) => p.fulfilment === 'delivered' || p.fulfilment === 'cancelled' },
] as const

/** UI-07 buyer orders: payment and per-shop fulfilment are shown separately. */
export function OrdersPage() {
  const buyer = useBuyer()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all')
  const list = useApi<Paged<PurchaseSummary>>(buyer.ok ? '/purchases?per_page=50' : null)

  if (!buyer.ok) return <BuyerOnly signedInAs={buyer.as} />
  if (list.error) return <main className="page"><LoadError error={list.error} onRetry={list.reload} /></main>
  if (!list.data) return <main className="page"><Loading /></main>
  const shown = list.data.data.filter(TABS.find((t) => t.key === tab)!.match)

  return (
    <main className="page">
      <h1>Your orders</h1>
      <p className="muted">Follow each shop's delivery and find your purchase details.</p>
      <div className="filter-tabs" role="group" aria-label="Filter orders">
        {TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {list.data.data.length === 0 ? (
        <div className="empty">
          <p className="muted">No orders yet. Orders you place appear here with each shop's delivery status.</p>
          <Link className="btn btn-primary" to="/products">
            Start shopping
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <p className="muted empty">No orders in this view.</p>
      ) : (
        <ul className="order-list">
          {shown.map((p) => (
            <li key={p.id} className="card">
              <div className="stack">
                <div>
                  <strong className="money">{p.reference}</strong>
                  <div className="muted">{when(p.placed_at)}</div>
                </div>
                <span>{p.seller_orders.map((o) => o.seller.name).join(' · ')}</span>
                <div className="order-meta">
                  <StatusBadge status={p.payment_status} />
                  {p.seller_orders.map((o) => (
                    <span key={o.id} className="muted">
                      {o.seller.name}: {o.status}
                    </span>
                  ))}
                </div>
                <Link className="btn" to={`/orders/${p.id}`}>
                  View purchase
                </Link>
              </div>
              <span className="money">{money(p.total_centavos)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
