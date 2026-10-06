<?php

namespace App\Modules\Orders;

use App\Http\ApiException;
use App\Models\User;
use App\Modules\Administration\Audit;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Orders\Models\DemoAdjustment;
use App\Modules\Orders\Models\DemoPayment;
use App\Modules\Orders\Models\SellerOrder;
use Illuminate\Support\Facades\DB;

/**
 * The only place seller order status changes (state-models.md). Every change locks the order row,
 * so a cancellation racing a shipment resolves to exactly one winner, and appends an event and an
 * audit entry in the same transaction.
 */
final class OrderTransitions
{
    /** Seller fulfilment path: placed → processing → shipped → delivered. */
    private const NEXT = ['placed' => OrderStatus::Processing, 'processing' => OrderStatus::Shipped, 'shipped' => OrderStatus::Delivered];

    /** API-08. Re-sending the step the order already reached is a safe replay (AC-17). */
    public static function advance(string $orderId, OrderStatus $to, int $expectedVersion, User $actor, ?string $dispatchReference = null): SellerOrder
    {
        return DB::transaction(function () use ($orderId, $to, $expectedVersion, $actor, $dispatchReference) {
            $order = SellerOrder::lockForUpdate()->findOrFail($orderId);
            if ($order->status === $to) {
                return $order;
            }
            if ((self::NEXT[$order->status->value] ?? null) !== $to) {
                throw new ApiException(409, 'invalid_transition', "A {$order->status->value} order cannot be marked {$to->value}.");
            }
            self::assertVersion($order, $expectedVersion);

            $from = $order->status;
            $order->forceFill(['status' => $to, 'version' => $order->version + 1] + match ($to) {
                OrderStatus::Shipped => ['shipped_at' => now(), 'dispatch_reference' => $dispatchReference],
                OrderStatus::Delivered => ['delivered_at' => now()],
                default => [],
            })->save();
            $order->events()->forceCreate(['actor_user_id' => $actor->id, 'from_status' => $from, 'to_status' => $to]);
            Audit::record("order.{$to->value}", $order, ['from' => $from->value, 'to' => $to->value]);

            return $order;
        });
    }

    /**
     * API-05 (BR-07, AC-11): cancel before shipment, restore stock and record the demo refund once.
     * A repeated cancellation returns the existing cancelled order and changes nothing.
     */
    public static function cancel(string $orderId, int $expectedVersion, User $actor, string $cancelledBy, ?string $reason): SellerOrder
    {
        return DB::transaction(function () use ($orderId, $expectedVersion, $actor, $cancelledBy, $reason) {
            $order = SellerOrder::lockForUpdate()->findOrFail($orderId);
            if ($order->status === OrderStatus::Cancelled) {
                return $order;
            }
            if (! in_array($order->status, [OrderStatus::Placed, OrderStatus::Processing], true)) {
                throw new ApiException(409, 'cancellation_not_allowed', 'This order has already shipped, so it can no longer be cancelled.');
            }
            self::assertVersion($order, $expectedVersion);

            foreach ($order->items as $item) {
                Inventory::where('product_id', $item->product_id)
                    ->increment('available_quantity', $item->quantity, ['version' => DB::raw('version + 1')]);
            }

            $from = $order->status;
            $order->forceFill([
                'status' => OrderStatus::Cancelled,
                'version' => $order->version + 1,
                'cancelled_at' => now(),
                'cancelled_by' => $cancelledBy,
                'cancel_reason' => $reason,
            ])->save();
            $order->events()->forceCreate(['actor_user_id' => $actor->id, 'from_status' => $from, 'to_status' => OrderStatus::Cancelled]);
            DemoAdjustment::forceCreate(['seller_order_id' => $order->id, 'amount_centavos' => $order->total_centavos]);

            // Simulated bookkeeping only: one cancelled order = partially refunded, all = refunded.
            $open = SellerOrder::where('purchase_id', $order->purchase_id)->where('status', '!=', OrderStatus::Cancelled)->exists();
            DemoPayment::where('purchase_id', $order->purchase_id)->update(['status' => $open ? 'partially_refunded' : 'refunded']);

            Audit::record('order.cancelled', $order, ['from' => $from->value, 'by' => $cancelledBy, 'restocked_lines' => $order->items->count()]);

            return $order;
        });
    }

    private static function assertVersion(SellerOrder $order, int $expected): void
    {
        if ($order->version !== $expected) {
            throw new ApiException(409, 'stale_version', 'This order changed since you loaded it. Refresh to see its current status.');
        }
    }
}
