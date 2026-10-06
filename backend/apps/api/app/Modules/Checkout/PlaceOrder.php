<?php

namespace App\Modules\Checkout;

use App\Http\ApiException;
use App\Models\User;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Checkout\Models\CheckoutAttempt;
use App\Modules\Orders\Models\Purchase;
use App\Modules\Orders\OrderStatus;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * API-03 demo checkout (BR-02..BR-05, AC-06..AC-09).
 *
 * The attempt row is committed first under a unique (buyer, key) index, so concurrent duplicates
 * serialize on it. Purchase creation is one transaction: stock is decremented with a guarded
 * conditional update in deterministic product order, so stock never goes negative and a
 * failure anywhere rolls back every row.
 */
final class PlaceOrder
{
    /**
     * @param  array{cart_version: int, address: array<string, ?string>, demo_outcome: string}  $input
     * @return array{0: CheckoutAttempt, 1: bool} the attempt and whether this request created it
     */
    public function __invoke(User $buyer, string $key, array $input): array
    {
        $hash = self::fingerprint($input);

        try {
            $attempt = CheckoutAttempt::forceCreate([
                'buyer_user_id' => $buyer->id,
                'idempotency_key' => $key,
                'request_hash' => $hash,
                'state' => 'pending',
            ]);
        } catch (UniqueConstraintViolationException) {
            $existing = CheckoutAttempt::where('buyer_user_id', $buyer->id)->where('idempotency_key', $key)->sole();
            if ($existing->request_hash !== $hash) {
                throw new ApiException(409, 'idempotency_key_reused', 'This checkout key was already used for a different order. Review your order again.');
            }
            if ($existing->state === 'pending') {
                throw new ApiException(409, 'attempt_in_progress', 'This order is still being placed. Check its status before trying again.');
            }

            return [$existing, false];
        }

        try {
            $failure = $input['demo_outcome'] === 'failure'
                ? 'demo_payment_declined' // BR-04: nothing is created or allocated.
                : $this->purchase($buyer, $attempt, $input);
        } catch (Throwable $e) {
            $attempt->forceFill(['state' => 'failed', 'failure_code' => 'server_error'])->save();
            throw $e;
        }

        if ($failure) {
            $attempt->forceFill(['state' => 'failed', 'failure_code' => $failure])->save();
        }

        return [$attempt->refresh(), true];
    }

    /** Same key + same cart version, normalized address and outcome = same request. */
    private static function fingerprint(array $input): string
    {
        $address = $input['address'];
        ksort($address);

        return hash('sha256', json_encode([(int) $input['cart_version'], $address, $input['demo_outcome']]));
    }

    private function purchase(User $buyer, CheckoutAttempt $attempt, array $input): ?string
    {
        try {
            DB::transaction(function () use ($buyer, $attempt, $input) {
                $cart = Cart::where('buyer_user_id', $buyer->id)->lockForUpdate()->first();
                if (! $cart || $cart->version !== (int) $input['cart_version']) {
                    throw new CheckoutFailed('cart_changed');
                }

                $summary = CartSummary::of($cart);
                if ($issue = CartSummary::blockingIssue($summary)) {
                    throw new CheckoutFailed($issue);
                }

                // Allocate in product-ID order (deadlock-free); the >= guard is the final oversell check.
                foreach ($cart->items->sortBy('product_id') as $item) {
                    $allocated = Inventory::where('product_id', $item->product_id)
                        ->where('available_quantity', '>=', $item->quantity)
                        ->decrement('available_quantity', $item->quantity, ['version' => DB::raw('version + 1')]);
                    if ($allocated !== 1) {
                        throw new CheckoutFailed('insufficient_stock');
                    }
                }

                $address = $input['address'];
                // PostgreSQL sequence (gap-tolerant, concurrency-safe). The SQLite test suite falls back
                // to max+1, which its single writer makes safe; the unique index guards both.
                $purchase = Purchase::forceCreate([
                    'number' => DB::getDriverName() === 'pgsql'
                        ? (int) DB::scalar("select nextval('purchase_number_seq')")
                        : (Purchase::max('number') ?? 1000) + 1,
                    'buyer_user_id' => $buyer->id,
                    'recipient_name' => $address['recipient_name'],
                    'address_line' => $address['address_line'],
                    'city' => $address['city'],
                    'postcode' => $address['postcode'],
                    'delivery_note' => $address['delivery_note'] ?? null,
                    'items_centavos' => $summary['items_centavos'],
                    'delivery_centavos' => $summary['delivery_centavos'],
                    'total_centavos' => $summary['total_centavos'],
                ]);

                foreach ($summary['groups'] as $i => $group) {
                    $order = $purchase->sellerOrders()->forceCreate([
                        'seller_id' => $group['seller']['id'],
                        'sequence' => $i + 1,
                        'status' => OrderStatus::Placed,
                        'items_centavos' => $group['items_centavos'],
                        'delivery_centavos' => $group['delivery_centavos'],
                        'total_centavos' => $group['total_centavos'],
                    ]);
                    foreach ($group['items'] as $line) {
                        $order->items()->forceCreate([
                            'product_id' => $line['product_id'],
                            'sku' => $line['sku'],
                            'title' => $line['title'],
                            'image_url' => $line['image_url'],
                            'unit_price_centavos' => $line['unit_price_centavos'],
                            'quantity' => $line['quantity'],
                            'line_total_centavos' => $line['line_total_centavos'],
                        ]);
                    }
                    $order->events()->forceCreate(['actor_user_id' => $buyer->id, 'to_status' => OrderStatus::Placed]);
                }

                $purchase->payment()->forceCreate(['status' => 'succeeded', 'amount_centavos' => $summary['total_centavos']]);

                $cart->items()->delete();
                $cart->increment('version');

                $attempt->forceFill(['state' => 'succeeded', 'purchase_id' => $purchase->id])->save();
            });
        } catch (CheckoutFailed $failed) {
            return $failed->failureCode;
        }

        return null;
    }
}
