import { useState, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ApiFailure, LoadError, Loading, Photo, Quantity, call, money, useApi, useHost, useSession, type Cart, type Paged, type Product, type Ref } from '@common-market/ui'
import { ProductGrid } from './components.tsx'
import { CATEGORIES, categoryLabel } from './lib.tsx'

/** UI-01 Discovery. */
export function Discovery() {
  const { data, error, reload } = useApi<Paged<Product>>('/products?per_page=24')
  // Photographed goods first on the landing grid.
  const featured = data && [...data.data].sort((a, b) => Number(!a.image_url) - Number(!b.image_url)).slice(0, 6)

  return (
    <main className="page">
      <nav aria-label="Categories" className="category-links">
        <Link to="/products" aria-current="page">
          All goods
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.value} to={`/products?category=${c.value}`}>
            {c.label}
          </Link>
        ))}
      </nav>
      <div className="section-head">
        <div>
          <h1>Useful things, thoughtfully chosen.</h1>
          <p className="muted">Find everyday goods from independent shops.</p>
        </div>
        <Link to="/products">Explore the collection →</Link>
      </div>
      {error ? <LoadError error={error} onRetry={reload} /> : featured ? <ProductGrid items={featured} /> : <Loading />}
      <section className="shops-intro">
        <h2>Small shops. Considered goods.</h2>
        <p>Kubo Living brings warmth to your home. Daily Objects makes room for better routines.</p>
        <Link className="btn" to="/products">
          Browse by shop
        </Link>
      </section>
    </main>
  )
}

const PAGE = 12
const SORTS = [
  ['featured', 'Featured'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['newest', 'Newest'],
] as const

/** UI-02 Filtered results. Filters live in the URL so they survive opening a product and returning (AC-01). */
export function Results() {
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const pages = Math.max(1, Number(get('pages')) || 1)

  const api = new URLSearchParams({ per_page: String(PAGE * pages) })
  for (const k of ['q', 'category', 'seller', 'sort']) if (get(k)) api.set(k, get(k))
  if (get('min')) api.set('min_price', String(Number(get('min')) * 100))
  if (get('max')) api.set('max_price', String(Number(get('max')) * 100))
  if (get('in_stock')) api.set('in_stock', '1')
  const { data, error, loading, reload } = useApi<Paged<Product, { sellers: Ref[] }>>(`/products?${api}`)

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k)
    if (!('pages' in changes)) next.delete('pages')
    setParams(next)
  }

  const sellers = data?.meta.sellers ?? []
  const chips: [string, string][] = [
    ...(get('q') ? [['q', `“${get('q')}”`] as [string, string]] : []),
    ...(get('category') ? [['category', categoryLabel(get('category'))] as [string, string]] : []),
    ...(get('seller') ? [['seller', sellers.find((s) => s.id === get('seller'))?.name ?? 'Shop'] as [string, string]] : []),
    ...(get('min') || get('max') ? [['price', `PHP ${get('min') || '0'}–${get('max') || 'any'}`] as [string, string]] : []),
    ...(get('in_stock') ? [['in_stock', 'In stock'] as [string, string]] : []),
  ]
  const removeChip = (key: string) => update(key === 'price' ? { min: null, max: null } : { [key]: null })
  const title = get('q') ? `Results for “${get('q')}”` : get('category') ? `${categoryLabel(get('category'))} essentials` : 'All goods'

  return (
    <main className="page">
      <p className="breadcrumbs muted">
        <Link to="/">Shop</Link> / {title}
      </p>
      <h1>{title}</h1>
      <div className="results">
        <details className="filters" open>
          <summary>Filter goods</summary>
          <Filters get={get} update={update} sellers={sellers} />
        </details>
        <section aria-labelledby="results-count">
          <div className="results-bar">
            <p id="results-count" className="muted" aria-live="polite">
              {data ? `${data.meta.total} matching goods` : ' '}
            </p>
            <label className="sort">
              <span className="visually-hidden">Sort</span>
              <select value={get('sort') || 'featured'} onChange={(e) => update({ sort: e.target.value === 'featured' ? null : e.target.value })}>
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    Sort: {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chips.length > 0 && (
            <ul className="chips" aria-label="Applied filters">
              {chips.map(([key, label]) => (
                <li key={key}>
                  <button type="button" className="chip" onClick={() => removeChip(key)} aria-label={`Remove filter ${label}`}>
                    {label} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error ? (
            <LoadError error={error} onRetry={reload} />
          ) : !data ? (
            <Loading />
          ) : data.meta.total === 0 ? (
            <div className="empty">
              <h2>No goods match these filters</h2>
              <p className="muted">Try a shorter search or remove a filter.</p>
              <button type="button" className="btn" onClick={() => setParams(new URLSearchParams())}>
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <ProductGrid items={data.data} />
              {data.data.length < data.meta.total && (
                <button type="button" className="btn load-more" disabled={loading} onClick={() => update({ pages: String(pages + 1) })}>
                  {loading ? 'Loading…' : 'Load more goods'}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function Filters({ get, update, sellers }: { get(k: string): string; update(c: Record<string, string | null>): void; sellers: Ref[] }) {
  const applyPrices = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    update({ min: String(form.get('min') || '') || null, max: String(form.get('max') || '') || null })
  }
  return (
    <div className="filter-body">
      <fieldset>
        <legend>Category</legend>
        {[{ value: '', label: 'All' }, ...CATEGORIES].map((c) => (
          <label key={c.value} className="check">
            <input type="radio" name="category" checked={get('category') === c.value} onChange={() => update({ category: c.value || null })} />
            {c.label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Shop</legend>
        {[{ id: '', name: 'All shops' }, ...sellers].map((s) => (
          <label key={s.id} className="check">
            <input type="radio" name="seller" checked={get('seller') === s.id} onChange={() => update({ seller: s.id || null })} />
            {s.name}
          </label>
        ))}
      </fieldset>
      <form onSubmit={applyPrices} key={`${get('min')}-${get('max')}`}>
        <label className="field">
          <span>Minimum price (PHP)</span>
          <input name="min" type="number" min="0" inputMode="numeric" defaultValue={get('min')} />
        </label>
        <label className="field">
          <span>Maximum price (PHP)</span>
          <input name="max" type="number" min="0" inputMode="numeric" defaultValue={get('max')} />
        </label>
        <button type="submit" className="btn">
          Apply prices
        </button>
      </form>
      <label className="check">
        <input type="checkbox" checked={!!get('in_stock')} onChange={(e) => update({ in_stock: e.target.checked ? '1' : null })} />
        In stock only
      </label>
    </div>
  )
}

/** UI-03 Product details (AC-03). */
export function ProductPage() {
  const { slug = '' } = useParams()
  const host = useHost()
  const location = useLocation()
  const { user } = useSession()
  const { data, error, reload } = useApi<{ data: Product }>(`/products/${encodeURIComponent(slug)}`)
  const [quantity, setQuantity] = useState(1)
  const [status, setStatus] = useState<{ kind: 'busy' | 'added' | 'error'; text?: string } | null>(null)

  if (error?.status === 404)
    return (
      <main className="page narrow">
        <h1>This product is not available</h1>
        <p className="muted">It may have been unpublished by the shop.</p>
        <Link className="btn" to="/products">
          Browse all goods
        </Link>
      </main>
    )
  if (error)
    return (
      <main className="page">
        <LoadError error={error} onRetry={reload} />
      </main>
    )
  if (!data) return <main className="page"><Loading /></main>
  const p = data.data

  async function addToCart() {
    if (!user) return host.navigate(`/sign-in?return=${encodeURIComponent(location.pathname)}`)
    setStatus({ kind: 'busy' })
    try {
      // PUT sets the line quantity, so add on top of what is already in the cart.
      const cart = await call<{ data: Cart }>(host, '/cart')
      const existing = cart.data.groups.flatMap((g) => g.items).find((l) => l.product_id === p.id)?.quantity ?? 0
      const next = Math.min(existing + quantity, p.max_quantity)
      await call(host, `/cart/items/${p.id}`, { method: 'PUT', body: JSON.stringify({ quantity: next }) })
      setStatus({ kind: 'added', text: `${next} in your cart.` })
    } catch (e) {
      const failure = e as ApiFailure
      setStatus({ kind: 'error', text: failure.status === 403 ? 'Sign in with the buyer demo account to shop.' : failure.message })
    }
  }

  return (
    <main className="page">
      <p className="breadcrumbs muted">
        <Link to="/">Shop</Link> / <Link to={`/products?category=${p.category}`}>{categoryLabel(p.category)}</Link> / {p.title}
      </p>
      <div className="product">
        <Photo src={p.image_url} alt={p.title} className="product-photo" />
        <div className="product-facts">
          <p className="eyebrow">{p.seller.name}</p>
          <h1>{p.title}</h1>
          <p className="money product-price">{money(p.price_centavos)}</p>
          <p>{p.description}</p>
          <p className={`badge ${p.in_stock ? 'badge-ok' : 'badge-warning'}`}>{p.in_stock ? 'In stock' : 'Out of stock'}</p>

          {p.in_stock && (
            <>
              <Quantity label={p.title} value={quantity} max={p.max_quantity} onChange={setQuantity} />
              <p className="muted">Up to {p.max_quantity} per order.</p>
              <button type="button" className="btn btn-primary btn-block" disabled={status?.kind === 'busy'} onClick={addToCart}>
                {status?.kind === 'busy' ? 'Adding…' : 'Add to cart'}
              </button>
            </>
          )}
          {status?.kind === 'added' && (
            <p className="notice" role="status">
              <span>Added. {status.text}</span>
              <Link to="/cart">View cart</Link>
            </p>
          )}
          {status?.kind === 'error' && (
            <p className="notice notice-error" role="alert">
              {status.text}
            </p>
          )}
          <p className="muted money">{money(p.delivery_centavos)} delivery per shop. Shown again at checkout.</p>

          <h2 className="facts-title">Good to know</h2>
          <dl className="facts">
            <dt>Material</dt>
            <dd>{p.material ?? '—'}</dd>
            <dt>Dimensions</dt>
            <dd>{p.dimensions ?? '—'}</dd>
          </dl>
          <p>
            Sold and fulfilled by <strong>{p.seller.name}</strong>
          </p>
          <Link className="btn" to={`/products?seller=${p.seller.id}`}>
            Visit shop
          </Link>
        </div>
      </div>
    </main>
  )
}
