// Response shapes of the Laravel /api/v1 contract (docs/api/outline.md).

export interface Paged<T, M = object> {
  data: T[]
  meta: { page: number; per_page: number; total: number } & M
}

export interface Ref {
  id: string
  name: string
}

export interface Product {
  id: string
  slug: string
  title: string
  category: string
  description: string
  material: string | null
  dimensions: string | null
  image_url: string | null
  price_centavos: number
  currency: 'PHP'
  in_stock: boolean
  max_quantity: number
  delivery_centavos: number
  seller: Ref
}

export interface CartLine {
  product_id: string
  sku: string
  slug: string
  title: string
  image_url: string | null
  unit_price_centavos: number
  previous_unit_price_centavos: number | null
  quantity: number
  max_quantity: number
  line_total_centavos: number
  issue: 'unavailable' | 'insufficient_stock' | 'price_changed' | null
}

export interface CartGroup {
  seller: Ref
  items: CartLine[]
  items_centavos: number
  delivery_centavos: number
  total_centavos: number
}

export interface Cart {
  version: number
  groups: CartGroup[]
  item_count: number
  items_centavos: number
  delivery_centavos: number
  total_centavos: number
  can_checkout: boolean
}

export type OrderStatus = 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Address {
  recipient_name: string
  address_line: string
  city: string
  postcode: string
  delivery_note: string | null
}

export interface SellerOrder {
  id: string
  reference: string
  purchase_reference: string
  seller: Ref
  status: OrderStatus
  version: number
  cancellable: boolean
  placed_at: string
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancelled_by: 'buyer' | 'seller' | null
  cancel_reason: string | null
  dispatch_reference: string | null
  items_centavos: number
  delivery_centavos: number
  total_centavos: number
  items: { product_id: string; sku: string; title: string; image_url: string | null; unit_price_centavos: number; quantity: number; line_total_centavos: number }[]
  events: { from_status: OrderStatus | null; to_status: OrderStatus; actor: 'buyer' | 'seller'; at: string }[]
}

/** The owning seller's view adds the buyer's delivery snapshot. */
export interface SellerOrderDetail extends SellerOrder {
  buyer_name: string
  address: Address
}

export interface SellerOrderRow {
  id: string
  reference: string
  buyer_name: string
  item_count: number
  total_centavos: number
  status: OrderStatus
  placed_at: string
}

export interface PurchaseSummary {
  id: string
  reference: string
  placed_at: string
  total_centavos: number
  payment_status: 'succeeded' | 'partially_refunded' | 'refunded'
  fulfilment: 'placed' | 'in_progress' | 'delivered' | 'cancelled'
  seller_orders: { id: string; seller: Ref; status: OrderStatus }[]
}

export interface PurchaseDetail extends Omit<PurchaseSummary, 'seller_orders'> {
  address: Address
  items_centavos: number
  delivery_centavos: number
  payment: { status: PurchaseSummary['payment_status']; simulated: true }
  seller_orders: SellerOrder[]
}

export interface CheckoutAttempt {
  key: string
  state: 'pending' | 'succeeded' | 'failed'
  failure_code: string | null
  purchase: PurchaseDetail | null
}

export interface SellerProduct {
  id: string
  sku: string
  slug: string
  title: string
  category: string
  description: string
  material: string | null
  dimensions: string | null
  image_url: string | null
  price_centavos: number
  visibility: 'draft' | 'published' | 'moderated'
  moderation_reason: string | null
  version: number
  available_quantity: number
  inventory_version: number
}

export type ReviewState = 'pending' | 'approved' | 'rejected'

export interface ApplicationSummary {
  id: string
  reference: string
  shop: Ref
  contact_name: string | null
  category_label: string | null
  state: ReviewState
  submitted_at: string
}

export interface ApplicationDetail extends ApplicationSummary {
  contact_email: string | null
  about: string | null
  sample_image_url: string | null
  review_reason: string | null
  reviewed_at: string | null
  reviewer: string | null
  version: number
  history: { action: string; actor: string | null; at: string; reason: string | null }[]
}

export interface ModeratedListing {
  id: string
  sku: string
  slug: string
  title: string
  image_url: string | null
  price_centavos: number
  seller: Ref
  visibility: SellerProduct['visibility']
  moderation_reason: string | null
  moderated_at: string | null
  version: number
}
