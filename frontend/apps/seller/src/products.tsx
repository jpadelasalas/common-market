import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiFailure, LoadError, Loading, Photo, StatusBadge, call, money, useApi, useHost, type Paged, type SellerProduct } from '@common-market/ui'

/** UI-11 product inventory. */
export function ProductList() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const visibility = params.get('visibility') ?? ''
  const query = new URLSearchParams({ per_page: '100', ...(q && { q }), ...(visibility && { visibility }) })
  const list = useApi<Paged<SellerProduct>>(`/seller/products?${query}`)
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: k === 'q' })
  }

  return (
    <main className="page work">
      <div className="title-row">
        <div>
          <h1>Products</h1>
          <p className="muted">Keep your listings and stock up to date.</p>
        </div>
        <Link className="btn btn-primary" to="new">
          Add product
        </Link>
      </div>
      <div className="toolbar">
        <label className="field grow">
          <span>Search products</span>
          <input type="search" placeholder="Product name or SKU" defaultValue={q} onChange={(e) => set('q', e.target.value.trim())} />
        </label>
        <label className="field">
          <span>Visibility</span>
          <select value={visibility} onChange={(e) => set('visibility', e.target.value)}>
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="moderated">Moderated</option>
          </select>
        </label>
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Loading />
      ) : list.data.data.length === 0 ? (
        <p className="muted empty">No products match. Clear the search or add a product.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col" className="num">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Visibility</th>
                <th scope="col">
                  <span className="visually-hidden">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((p) => (
                <tr key={p.id}>
                  <td data-label="Product">
                    <span className="product-cell">
                      <Photo src={p.image_url} alt={p.title} className="thumb-sm" />
                      <span>
                        <strong>{p.title}</strong>
                        <span className="muted money">{p.sku}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Price" className="num money">{money(p.price_centavos)}</td>
                  <td data-label="Stock">{p.available_quantity ? `${p.available_quantity} available` : 'Out of stock'}</td>
                  <td data-label="Visibility">
                    <StatusBadge status={p.visibility} />
                  </td>
                  <td>
                    <Link className="btn" to={p.id} aria-label={`Edit ${p.title}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Your shop's products only · Inventory changes are checked before saving.</p>
        </>
      )}
    </main>
  )
}

interface Form {
  title: string
  category: string
  price: string
  material: string
  dimensions: string
  description: string
  image_url: string
  stock: string
}

const empty: Form = { title: '', category: '', price: '', material: '', dimensions: '', description: '', image_url: '', stock: '0' }
const toForm = (p: SellerProduct): Form => ({
  title: p.title,
  category: p.category,
  price: (p.price_centavos / 100).toFixed(2),
  material: p.material ?? '',
  dimensions: p.dimensions ?? '',
  description: p.description,
  image_url: p.image_url ?? '',
  stock: String(p.available_quantity),
})

const VISIBILITY_TEXT = {
  published: 'This listing is visible to buyers.',
  draft: 'Draft: only you can see this listing. Publish it when the details are ready.',
  moderated: 'An administrator unpublished this listing. It needs admin clearance before it can be published again.',
}

/**
 * UI-12 product editor (AC-13, AC-15). Edits are sent with the version that was loaded. If someone
 * else changed the product meanwhile, the seller's input is kept and they choose how to continue.
 */
export function ProductEditor() {
  const { id } = useParams()
  const isNew = !id
  const host = useHost()
  const navigate = useNavigate()
  const loaded = useApi<{ data: SellerProduct }>(isNew ? null : `/seller/products/${encodeURIComponent(id)}`)

  const [base, setBase] = useState<SellerProduct | null>(null) // version the form is based on
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [conflict, setConflict] = useState<SellerProduct | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loaded.data && !base) {
      setBase(loaded.data.data)
      setForm(toForm(loaded.data.data))
    }
  }, [loaded.data, base])

  if (loaded.error?.status === 404)
    return (
      <main className="page work">
        <h1>Product not found</h1>
        <p className="muted">It does not exist or belongs to another shop.</p>
        <Link to="/seller/products">Back to products</Link>
      </main>
    )
  if (loaded.error) return <main className="page work"><LoadError error={loaded.error} onRetry={loaded.reload} /></main>
  if (!isNew && !base) return <main className="page work"><Loading /></main>

  const field = (name: keyof Form) => ({
    name,
    value: form[name],
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [name]: e.target.value }),
  })
  const error = (name: string) =>
    errors[name] && (
      <span id={`${name}-error`} className="field-error">
        {errors[name]}
      </span>
    )

  function validate(): Record<string, string> {
    const e: Record<string, string> = {}
    if (form.title.trim().length < 3) e.title = 'Enter a product name of at least 3 characters.'
    if (!form.category) e.category = 'Choose a category.'
    if (!/^\d+(\.\d{1,2})?$/.test(form.price) || Number(form.price) < 1) e.price = 'Enter a price of at least PHP 1.00.'
    if (form.description.trim().length < 10) e.description = 'Describe the product in at least 10 characters.'
    if (!/^\d+$/.test(form.stock)) e.stock = 'Stock must be a whole number of 0 or more.'
    if (form.image_url && !/^https:\/\//.test(form.image_url)) e.image_url = 'Use an https:// image address.'
    return e
  }

  const payload = () => ({
    title: form.title.trim(),
    category: form.category,
    price_centavos: Math.round(Number(form.price) * 100),
    material: form.material.trim() || null,
    dimensions: form.dimensions.trim() || null,
    description: form.description.trim(),
    image_url: form.image_url.trim() || null,
  })

  function apiErrors(failure: ApiFailure) {
    const map: Record<string, string> = { price_centavos: 'price', available_quantity: 'stock' }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries<string[]>(failure.body?.errors ?? {})) out[map[k] ?? k] = v[0]
    setErrors(out)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const local = validate()
    setErrors(local)
    setNotice(null)
    if (Object.keys(local).length) return
    setBusy(true)
    try {
      if (isNew) {
        const res = await call<{ data: SellerProduct }>(host, '/seller/products', {
          method: 'POST',
          body: JSON.stringify({ ...payload(), available_quantity: Number(form.stock) }),
        })
        return navigate(`/seller/products/${res.data.id}`, { replace: true })
      }
      let current = base!
      const fields = payload()
      const changed = Object.entries(fields).some(([k, v]) => (current as any)[k] !== v)
      if (changed) {
        current = (await call<{ data: SellerProduct }>(host, `/seller/products/${current.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ ...fields, expected_version: current.version }),
        })).data
      }
      if (Number(form.stock) !== current.available_quantity) {
        current = (await call<{ data: SellerProduct }>(host, `/seller/products/${current.id}/inventory`, {
          method: 'PATCH',
          body: JSON.stringify({ available_quantity: Number(form.stock), expected_version: current.inventory_version }),
        })).data
      }
      setBase(current)
      setNotice({ kind: 'ok', text: 'Changes saved.' })
    } catch (err) {
      const failure = err as ApiFailure
      if (failure.code === 'stale_version' && failure.body?.data) setConflict(failure.body.data)
      else if (failure.status === 422) apiErrors(failure)
      else setNotice({ kind: 'error', text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisibility() {
    if (!base) return
    setBusy(true)
    setNotice(null)
    try {
      const action = base.visibility === 'published' ? 'unpublish' : 'publish'
      const res = await call<{ data: SellerProduct }>(host, `/seller/products/${base.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ expected_version: base.version }),
      })
      setBase(res.data)
      setNotice({ kind: 'ok', text: action === 'publish' ? 'Listing published.' : 'Listing unpublished. Buyers can no longer see it.' })
    } catch (err) {
      const failure = err as ApiFailure
      if (failure.code === 'stale_version' && failure.body?.data) setConflict(failure.body.data)
      else setNotice({ kind: 'error', text: failure.message })
    } finally {
      setBusy(false)
    }
  }

  const title = isNew ? 'Add product' : 'Edit product'

  return (
    <main className="page work">
      <p className="breadcrumbs muted">
        <Link to="/seller/products">Products</Link> / {isNew ? 'New product' : base!.title}
      </p>
      <h1>{title}</h1>
      <p className="muted">Keep the details customers need to make a good decision.</p>

      {conflict && (
        <div className="notice notice-warning" role="alert">
          <strong>This product changed since you opened it</strong>
          <span>
            Saved now: {conflict.title} · {money(conflict.price_centavos)} · {conflict.available_quantity} in stock · {conflict.visibility}. Your edits below are
            kept.
          </span>
          <div className="actions-inline">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setBase(conflict)
                setConflict(null)
                setNotice({ kind: 'ok', text: 'Your edits now apply to the latest version. Review them and save again.' })
              }}
            >
              Keep my edits
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setBase(conflict)
                setForm(toForm(conflict))
                setConflict(null)
              }}
            >
              Use saved version
            </button>
          </div>
        </div>
      )}
      {notice && (
        <p className={`notice ${notice.kind === 'error' ? 'notice-error' : ''}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      <form className="two-col" onSubmit={save} noValidate>
        <section className="card form-grid" aria-labelledby="details-title">
          <h2 id="details-title">Product details</h2>
          <label className="field">
            <span>Product name *</span>
            <input {...field('title')} maxLength={120} />
            {error('title')}
          </label>
          <label className="field">
            <span>Category *</span>
            <select {...field('category')}>
              <option value="">Choose a category</option>
              <option value="home">Home</option>
              <option value="kitchen">Kitchen</option>
              <option value="everyday">Everyday</option>
            </select>
            {error('category')}
          </label>
          <div className="pair">
            <label className="field">
              <span>Price (PHP) *</span>
              <input {...field('price')} inputMode="decimal" />
              {error('price')}
            </label>
            <label className="field">
              <span>Material</span>
              <input {...field('material')} maxLength={80} />
            </label>
          </div>
          <label className="field">
            <span>Dimensions</span>
            <input {...field('dimensions')} maxLength={80} />
          </label>
          <label className="field">
            <span>Description *</span>
            <textarea {...field('description')} maxLength={2000} rows={4} />
            {error('description')}
          </label>
          <div className="field">
            <span>Product photography</span>
            <Photo src={form.image_url || null} alt={form.title || 'Product'} className="editor-photo" />
            <label className="field">
              <span className="muted">Image address (https)</span>
              <input {...field('image_url')} inputMode="url" />
              {error('image_url')}
            </label>
            <span className="muted">Seeded photo references for this demo. Real uploads are deferred.</span>
          </div>
        </section>

        <div className="stack">
          <section className="card form-grid" aria-labelledby="inventory-title">
            <h2 id="inventory-title">Inventory</h2>
            <label className="field">
              <span>Available stock *</span>
              <input {...field('stock')} inputMode="numeric" />
              {error('stock')}
            </label>
            <p className="muted">Stock changes are checked against the latest saved version, so new orders are never overwritten.</p>
          </section>
          <section className="card form-grid" aria-labelledby="visibility-title">
            <h2 id="visibility-title">Visibility</h2>
            {isNew ? (
              <>
                <StatusBadge status="draft" />
                <p className="muted">New products are saved as drafts. Publish when the details are ready.</p>
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Saving…' : 'Save draft'}
                </button>
              </>
            ) : (
              <>
                <StatusBadge status={base!.visibility} />
                <p className="muted">{VISIBILITY_TEXT[base!.visibility]}</p>
                {base!.moderation_reason && <p className="notice notice-error">Reason: {base!.moderation_reason}</p>}
                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                {base!.visibility !== 'moderated' && (
                  <button type="button" className="btn btn-block" disabled={busy} onClick={toggleVisibility}>
                    {base!.visibility === 'published' ? 'Unpublish listing' : 'Publish listing'}
                  </button>
                )}
              </>
            )}
          </section>
          <Link className="btn btn-block" to="/seller/products">
            Back to products
          </Link>
        </div>
      </form>
    </main>
  )
}
