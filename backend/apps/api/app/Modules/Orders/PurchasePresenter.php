<?php

namespace App\Modules\Orders;

use App\Modules\Orders\Models\OrderEvent;
use App\Modules\Orders\Models\OrderItem;
use App\Modules\Orders\Models\Purchase;
use App\Modules\Orders\Models\SellerOrder;

/** Purchase and seller-order DTOs. Callers must scope records to the viewer first. */
final class PurchasePresenter
{
    /**
     * state-models.md: all cancelled = cancelled; all non-cancelled delivered = delivered;
     * any progress = in_progress; otherwise placed. Shown alongside each seller's own status.
     */
    public static function fulfilment(Purchase $p): string
    {
        $statuses = $p->sellerOrders->map(fn (SellerOrder $o) => $o->status)->all();
        $open = array_filter($statuses, fn ($s) => $s !== OrderStatus::Cancelled);

        return match (true) {
            $open === [] => 'cancelled',
            ! array_filter($open, fn ($s) => $s !== OrderStatus::Delivered) => 'delivered',
            $open !== $statuses || array_filter($open, fn ($s) => $s !== OrderStatus::Placed) !== [] => 'in_progress',
            default => 'placed',
        };
    }

    public static function summary(Purchase $p): array
    {
        $p->loadMissing(['sellerOrders.seller', 'payment']);

        return [
            'id' => $p->id,
            'reference' => $p->reference(),
            'placed_at' => $p->created_at->toIso8601String(),
            'total_centavos' => $p->total_centavos,
            'currency' => $p->currency,
            'payment_status' => $p->payment->status,
            'fulfilment' => self::fulfilment($p),
            'seller_orders' => $p->sellerOrders->map(fn (SellerOrder $o) => [
                'id' => $o->id,
                'seller' => ['id' => $o->seller->id, 'name' => $o->seller->name],
                'status' => $o->status->value,
            ])->all(),
        ];
    }

    public static function detail(Purchase $p): array
    {
        $p->loadMissing(['sellerOrders.seller', 'sellerOrders.items', 'sellerOrders.events', 'payment']);
        $p->sellerOrders->each->setRelation('purchase', $p);

        return [
            ...self::summary($p),
            'address' => self::address($p),
            'items_centavos' => $p->items_centavos,
            'delivery_centavos' => $p->delivery_centavos,
            'payment' => ['status' => $p->payment->status, 'simulated' => true],
            'seller_orders' => $p->sellerOrders->map(fn (SellerOrder $o) => self::order($o))->all(),
        ];
    }

    /** One seller's portion; shared by the buyer tracking view and the seller order view. */
    public static function order(SellerOrder $o): array
    {
        $buyerId = $o->purchase->buyer_user_id;

        return [
            'id' => $o->id,
            'reference' => $o->reference(),
            'purchase_reference' => $o->purchase->reference(),
            'seller' => ['id' => $o->seller->id, 'name' => $o->seller->name],
            'status' => $o->status->value,
            'version' => $o->version,
            'cancellable' => $o->isCancellable(),
            'placed_at' => $o->created_at->toIso8601String(),
            'shipped_at' => $o->shipped_at?->toIso8601String(),
            'delivered_at' => $o->delivered_at?->toIso8601String(),
            'cancelled_at' => $o->cancelled_at?->toIso8601String(),
            'cancelled_by' => $o->cancelled_by,
            'cancel_reason' => $o->cancel_reason,
            'dispatch_reference' => $o->dispatch_reference,
            'items_centavos' => $o->items_centavos,
            'delivery_centavos' => $o->delivery_centavos,
            'total_centavos' => $o->total_centavos,
            'items' => $o->items->map(fn (OrderItem $i) => [
                'product_id' => $i->product_id,
                'sku' => $i->sku,
                'title' => $i->title,
                'image_url' => $i->image_url,
                'unit_price_centavos' => $i->unit_price_centavos,
                'quantity' => $i->quantity,
                'line_total_centavos' => $i->line_total_centavos,
            ])->all(),
            'events' => $o->events->map(fn (OrderEvent $e) => [
                'from_status' => $e->from_status?->value,
                'to_status' => $e->to_status->value,
                'actor' => $e->actor_user_id === $buyerId ? 'buyer' : 'seller',
                'at' => $e->created_at->toIso8601String(),
            ])->all(),
        ];
    }

    /** Address snapshot: only for the buyer, the owning seller (fulfilment) and admin oversight. */
    public static function address(Purchase $p): array
    {
        return [
            'recipient_name' => $p->recipient_name,
            'address_line' => $p->address_line,
            'city' => $p->city,
            'postcode' => $p->postcode,
            'delivery_note' => $p->delivery_note,
        ];
    }
}
