import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ApiFailure, LoadError, Loading, Photo, Quantity, call, money, useApi, useHost, useSession, type Cart, type CartGroup, type CartLine, type CheckoutAttempt } from '@common-market/ui'
import { BuyerOnly } from './components.tsx'

/** Buyer-only pages render a sign-in explanation for guests and other roles. */
export function useBuyer(): { ok: true } | { ok: false; as?: string } {
  const { user } = useSession()
  if (!user) return { ok: false }
  return user.roles.includes('buyer') ? { ok: true } : { ok: false, as: user.roles[0] }
}

/** CMP-08 summary block shared by cart, checkout and confirmation. */
export function Summary({ groups, items, total, children }: { groups: { seller: { name: string }; delivery_centavos: number }[]; items: number; total: number; children?: ReactNode }) {
  return (
    <aside className="card summary" aria-label="Order summary">
      <h2>Order summary</h2>
      <dl className="lines">
        <dt>Items</dt>
        <dd className="money">{money(items)}</dd>
        {groups.map((g) => (
          <div key={g.seller.name} className="line">
            <dt>{g.seller.name} delivery</dt>
            <dd className="money">{money(g.delivery_centavos)}</dd>
          </div>
        ))}
      </dl>
      <p className="total">
        <span>Total</span>
        <span className="money">{money(total)}</span>
      </p>
      {children}
    </aside>
  )
}

const ISSUE_TEXT = {
  unavailable: () => 'No longer available. Remove it to continue.',
  insufficient_stock: (l: CartLine) => (l.max_quantity ? `Only ${l.max_quantity} available. Lower the quantity to continue.` : 'Out of stock. Remove it to continue.'),
  price_changed: (l: CartLine) => `Price changed from ${money(l.previous_unit_price_centavos ?? 0)} to ${money(l.unit_price_centavos)}.`,
}

/** UI-04 Cart (AC-04, AC-05). Line writes are serialized: a line's controls lock while it saves. */
export function CartPage() {
  const buyer = useBuyer()
  const host = useHost()
  const cart = useApi<{ data: Cart }>(buyer.ok ? '/cart' : null)
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!buyer.ok) return <BuyerOnly signedInAs={buyer.as} />
  if (cart.error) return <main className="page"><LoadError error={cart.error} onRetry={cart.reload} /></main>
  if (!cart.data) return <main className="page"><Loading /></main>
  const c = cart.data.data

  async function write(line: CartLine, quantity: number | null) {
    setPending(line.product_id)
    setMessage(null)
    try {
      const path = `/cart/items/${line.product_id}`
      const res = await call<{ data: Cart }>(host, path, quantity === null ? { method: 'DELETE' } : { method: 'PUT', body: JSON.stringify({ quantity }) })
      cart.setData(res)
    } catch (e) {
      const failure = e as ApiFailure
      if (failure.body?.data) cart.setData({ data: failure.body.data })
      setMessage(failure.message)
    } finally {
      setPending(null)
    }
  }

  if (c.item_count === 0)
    return (
      <main className="page narrow">
        <h1>Your cart is empty</h1>
        <p className="muted">Goods you add from any shop will appear here, grouped by shop.</p>
        <Link className="btn btn-primary" to="/products">
          Continue shopping
        </Link>
      </main>
    )

  return (
    <main className="page">
      <h1>Your cart</h1>
      <p className="muted">
        {c.item_count} items from {c.groups.length} {c.groups.length === 1 ? 'shop' : 'shops'}. Each shop ships separately.
      </p>
      {message && (
        <p className="notice notice-error" role="alert">
          {message}
        </p>
      )}
      <div className="two-col">
        <div className="stack">
          {c.groups.map((g) => (
            <SellerGroup key={g.seller.id} group={g} pending={pending} onWrite={write} />
          ))}
          <Link className="btn" to="/products">
            Continue shopping
          </Link>
        </div>
        <Summary groups={c.groups} items={c.items_centavos} total={c.total_centavos}>
          {c.can_checkout ? (
            <Link className="btn btn-primary btn-block" to="/checkout">
              Review order
            </Link>
          ) : (
            <>
              <button type="button" className="btn btn-primary btn-block" disabled>
                Review order
              </button>
              <p className="muted">Resolve the highlighted items to continue.</p>
            </>
          )}
          <p className="muted">Delivery costs are included per shop.</p>
        </Summary>
      </div>
    </main>
  )
}

/** CMP-07 seller cart group. */
function SellerGroup({ group, pending, onWrite }: { group: CartGroup; pending: string | null; onWrite(line: CartLine, quantity: number | null): void }) {
  return (
    <section className="card" aria-labelledby={`group-${group.seller.id}`}>
      <div className="card-head">
        <h2 id={`group-${group.seller.id}`}>{group.seller.name}</h2>
        <span className="muted">
          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <ul className="cart-lines">
        {group.items.map((l) => {
          const busy = pending === l.product_id
          return (
            <li key={l.product_id} className={l.issue ? 'has-issue' : undefined} aria-busy={busy}>
              <Photo src={l.image_url} alt={l.title} className="thumb" />
              <div className="line-body">
                <Link to={`/products/${l.slug}`}>{l.title}</Link>
                <span className="muted money">{money(l.unit_price_centavos)} each</span>
                <div className="line-controls">
                  {l.issue !== 'unavailable' && (
                    <Quantity label={l.title} value={l.quantity} max={Math.max(l.max_quantity, 1)} busy={busy} onChange={(q) => onWrite(l, q)} />
                  )}
                  <button type="button" className="link-button" disabled={busy} onClick={() => onWrite(l, null)}>
                    Remove
                  </button>
                </div>
                {l.issue && (
                  <p className="notice notice-warning">
                    {ISSUE_TEXT[l.issue](l)}
                    {l.issue === 'price_changed' && (
                      <button type="button" className="btn" disabled={busy} onClick={() => onWrite(l, l.quantity)}>
                        Accept new price
                      </button>
                    )}
                  </p>
                )}
              </div>
              <span className="money">{money(l.line_total_centavos)}</span>
            </li>
          )
        })}
      </ul>
      <dl className="lines group-foot">
        <dt>Delivery</dt>
        <dd className="money">{money(group.delivery_centavos)}</dd>
        <div className="line strong">
          <dt>Seller total</dt>
          <dd className="money">{money(group.total_centavos)}</dd>
        </div>
      </dl>
    </section>
  )
}

const PENDING_KEY = 'cm-checkout-pending'
const FIELDS = [
  ['recipient_name', 'Full name', 'name'],
  ['address_line', 'Address line', 'street-address'],
  ['city', 'City', 'address-level2'],
  ['postcode', 'Postcode', 'postal-code'],
] as const
type Address = Record<(typeof FIELDS)[number][0] | 'delivery_note', string>

function readPending(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}
function writePending(key: string | null) {
  try {
    if (key) sessionStorage.setItem(PENDING_KEY, key)
    else sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* storage unavailable: reconciliation falls back to this page's memory */
  }
}

/**
 * UI-05 Checkout (AC-06..AC-08). One idempotency key per review; a network failure leaves the
 * outcome unknown, so the buyer must check the existing attempt before anything is resubmitted.
 */
export function CheckoutPage() {
  const buyer = useBuyer()
  const host = useHost()
  const { user } = useSession()
  const cart = useApi<{ data: Cart }>(buyer.ok ? '/cart' : null)

  const keyRef = useRef(readPending() ?? crypto.randomUUID())
  const [unknown, setUnknown] = useState(readPending() !== null)
  const [address, setAddress] = useState<Address>({ recipient_name: user?.name ?? '', address_line: '', city: '', postcode: '', delivery_note: '' })
  const [outcome, setOutcome] = useState<'success' | 'failure'>('success')
  const [errors, setErrors] = useState<Partial<Address>>({})
  const [notice, setNotice] = useState<{ text: string; toCart?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!buyer.ok) return <BuyerOnly signedInAs={buyer.as} />
  if (cart.error) return <main className="page"><LoadError error={cart.error} onRetry={cart.reload} /></main>
  if (!cart.data) return <main className="page"><Loading /></main>
  const c = cart.data.data

  const freshKey = () => {
    keyRef.current = crypto.randomUUID()
    writePending(null)
  }

  function settle(attempt: CheckoutAttempt) {
    setUnknown(false)
    if (attempt.state === 'succeeded' && attempt.purchase) {
      writePending(null)
      return host.navigate(`/orders/${attempt.purchase.id}?placed=1`)
    }
    if (attempt.state === 'pending') return setNotice({ text: 'Your order is still being placed. Check again in a moment.' })
    freshKey()
    setNotice({
      text:
        attempt.failure_code === 'demo_payment_declined'
          ? 'Demo payment failed. No order was placed, no stock was used and your cart is unchanged. Choose Success to place the demo order.'
          : 'The order could not be placed. Your cart is unchanged.',
    })
  }

  async function reconcile() {
    setBusy(true)
    try {
      settle((await call<{ data: CheckoutAttempt }>(host, `/checkout-attempts/${keyRef.current}`)).data)
    } catch (e) {
      const failure = e as ApiFailure
      if (failure.status === 404) {
        // Nothing was recorded for this key, so submitting again is safe.
        setUnknown(false)
        writePending(null)
        setNotice({ text: 'No order was placed. You can place the demo order now.' })
      } else setNotice({ text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const local: Partial<Address> = {}
    for (const [name, label] of FIELDS) if (!address[name].trim()) local[name] = `Enter ${label.toLowerCase()}.`
    if (address.postcode && !/^\d{4}$/.test(address.postcode.trim())) local.postcode = 'Enter a 4-digit postcode.'
    setErrors(local)
    if (Object.keys(local).length) return

    setBusy(true)
    setNotice(null)
    writePending(keyRef.current)
    try {
      const res = await call<{ data: CheckoutAttempt }>(host, '/checkout-attempts', {
        method: 'POST',
        headers: { 'Idempotency-Key': keyRef.current },
        body: JSON.stringify({ cart_version: c.version, address: { ...address, delivery_note: address.delivery_note || null }, demo_outcome: outcome }),
      })
      settle(res.data)
    } catch (err) {
      const failure = err as ApiFailure
      if (failure.status === 0 || failure.code === 'attempt_in_progress') {
        setUnknown(true) // keep the key: the server may have placed the order
      } else {
        writePending(null)
        if (failure.status === 422) {
          const fieldErrors: Partial<Address> = {}
          for (const [k, v] of Object.entries<string[]>(failure.body?.errors ?? {})) fieldErrors[k.replace('address.', '') as keyof Address] = v[0]
          setErrors(fieldErrors)
        } else {
          freshKey()
          if (failure.body?.data) cart.setData({ data: failure.body.data })
          setNotice({ text: failure.message, toCart: ['cart_changed', 'insufficient_stock'].includes(failure.code) })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  if (c.item_count === 0) return <CartPage />

  return (
    <main className="page">
      <p className="breadcrumbs muted">
        <Link to="/cart">Cart</Link> / Checkout
      </p>
      <h1>Review your order</h1>
      <p className="muted">This is a demo purchase. No card or payment gateway is needed.</p>

      {unknown && (
        <div className="notice notice-warning" role="alert">
          <strong>We could not confirm your last order</strong>
          <span>Check its status before placing it again, so it is not placed twice.</span>
          <button type="button" className="btn" disabled={busy} onClick={reconcile}>
            {busy ? 'Checking…' : 'Check order status'}
          </button>
        </div>
      )}
      {notice && (
        <div className="notice notice-error" role="alert">
          <span>{notice.text}</span>
          {notice.toCart && (
            <Link className="btn" to="/cart">
              Return to cart
            </Link>
          )}
        </div>
      )}

      <form className="two-col" onSubmit={submit} noValidate>
        <div className="stack">
          <section className="card form-card" aria-labelledby="address-title">
            <h2 id="address-title">Delivery address</h2>
            <p className="muted">Use fictional information for this portfolio demo.</p>
            {FIELDS.map(([name, label, autoComplete]) => (
              <label key={name} className="field">
                <span>{label} *</span>
                <input
                  name={name}
                  autoComplete={autoComplete}
                  inputMode={name === 'postcode' ? 'numeric' : undefined}
                  value={address[name]}
                  aria-invalid={!!errors[name]}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  onChange={(e) => setAddress({ ...address, [name]: e.target.value })}
                />
                {errors[name] && (
                  <span id={`${name}-error`} className="field-error">
                    {errors[name]}
                  </span>
                )}
              </label>
            ))}
            <label className="field">
              <span>Delivery note (optional)</span>
              <textarea name="delivery_note" value={address.delivery_note} onChange={(e) => setAddress({ ...address, delivery_note: e.target.value })} />
            </label>
          </section>

          <fieldset className="card form-card">
            <legend>Demo payment result</legend>
            <p className="muted">Choose an outcome to try the checkout flow.</p>
            <div className="outcome">
              {(['success', 'failure'] as const).map((o) => (
                <label key={o} className={`btn ${outcome === o ? 'btn-selected' : ''}`}>
                  <input type="radio" name="demo_outcome" value={o} checked={outcome === o} onChange={() => setOutcome(o)} className="visually-hidden" />
                  {o === 'success' ? 'Success' : 'Failure'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="stack">
          <aside className="card" aria-label="Your items">
            <h2>Your items</h2>
            {c.groups.map((g) => (
              <div key={g.seller.id} className="review-group">
                <strong>{g.seller.name}</strong>
                {g.items.map((l) => (
                  <span key={l.product_id}>
                    {l.quantity} × {l.title}
                  </span>
                ))}
                <span className="money">{money(g.total_centavos)} incl. delivery</span>
              </div>
            ))}
          </aside>
          <Summary groups={c.groups} items={c.items_centavos} total={c.total_centavos}>
            <p className="muted">Demo only. No money will be collected.</p>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || unknown || !c.can_checkout}>
              {busy ? 'Placing order…' : 'Place demo order'}
            </button>
            {!c.can_checkout && (
              <p className="muted">
                Your cart needs attention. <Link to="/cart">Return to cart</Link>
              </p>
            )}
          </Summary>
        </div>
      </form>
    </main>
  )
}
