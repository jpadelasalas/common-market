import { Link, useLocation } from 'react-router'
import { Photo, money, type Product } from '@common-market/ui'

/** CMP-04 product tile: the title is the main link; price always visible. */
export function ProductTile({ product }: { product: Product }) {
  return (
    <article className="tile">
      <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <Photo src={product.image_url} alt={product.title} />
      </Link>
      <h3>
        <Link to={`/products/${product.slug}`}>{product.title}</Link>
      </h3>
      <p className="muted">{product.seller.name}</p>
      <p className="money tile-price">{money(product.price_centavos)}</p>
      {!product.in_stock && <p className="badge badge-warning">Out of stock</p>}
    </article>
  )
}

export function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid">
      {items.map((p) => (
        <ProductTile key={p.id} product={p} />
      ))}
    </div>
  )
}

/** Buyer-only areas: explain and offer sign-in with a safe return path (AC-23). */
export function BuyerOnly({ signedInAs }: { signedInAs?: string }) {
  const location = useLocation()
  const returnTo = encodeURIComponent(location.pathname + location.search)
  return (
    <main className="page narrow">
      <h1>Sign in to shop</h1>
      <p className="muted">
        {signedInAs
          ? `You are signed in as a ${signedInAs}. Carts and orders belong to buyer accounts; sign in as the demo buyer to continue.`
          : 'Your cart, checkout and orders are kept with your buyer account.'}
      </p>
      <Link className="btn btn-primary" to={`/sign-in?return=${returnTo}`}>
        {signedInAs ? 'Switch to buyer' : 'Sign in'}
      </Link>
    </main>
  )
}
