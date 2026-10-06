<?php

namespace App\Modules\Checkout;

use App\Modules\Catalog\Visibility;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Sellers\ReviewState;

/**
 * Server-authoritative cart view (BR-02, AC-04/AC-05): lines grouped by seller, one delivery fee
 * per seller, current prices, and issues that block checkout until the buyer resolves them.
 */
final class CartSummary
{
    /** BR-10: flat fictional delivery fee per seller order. */
    public const DELIVERY_CENTAVOS = 8000;

    /** Quantity limit per line shown on the product page (AC-03). */
    public const MAX_PER_LINE = 10;

    public static function of(Cart $cart): array
    {
        $cart->loadMissing(['items.product.seller', 'items.product.inventory']);

        $groups = [];
        // Shops and lines in the order the buyer added them (ULIDs are monotonic).
        foreach ($cart->items->sortBy('id') as $item) {
            $product = $item->product;
            $available = $product->inventory?->available_quantity ?? 0;

            $issue = match (true) {
                $product->visibility !== Visibility::Published || $product->seller->status !== ReviewState::Approved => 'unavailable',
                $available < $item->quantity => 'insufficient_stock',
                $product->price_centavos !== $item->unit_price_centavos => 'price_changed',
                default => null,
            };

            $group = &$groups[$product->seller_id];
            $group ??= ['seller' => ['id' => $product->seller->id, 'name' => $product->seller->name], 'items' => []];
            $group['items'][] = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'slug' => $product->slug,
                'title' => $product->title,
                'image_url' => $product->image_url,
                'unit_price_centavos' => $product->price_centavos,
                'previous_unit_price_centavos' => $issue === 'price_changed' ? $item->unit_price_centavos : null,
                'quantity' => $item->quantity,
                'max_quantity' => min(self::MAX_PER_LINE, $available),
                'line_total_centavos' => $product->price_centavos * $item->quantity,
                'issue' => $issue,
            ];
            unset($group);
        }

        $groups = array_values(array_map(function (array $g) {
            $items = array_sum(array_column($g['items'], 'line_total_centavos'));

            return $g + [
                'items_centavos' => $items,
                'delivery_centavos' => self::DELIVERY_CENTAVOS,
                'total_centavos' => $items + self::DELIVERY_CENTAVOS,
            ];
        }, $groups));

        $lines = array_merge(...array_column($groups, 'items') ?: [[]]);
        $items = array_sum(array_column($groups, 'items_centavos'));
        $delivery = self::DELIVERY_CENTAVOS * count($groups);

        return [
            'version' => $cart->version,
            'groups' => $groups,
            'item_count' => array_sum(array_column($lines, 'quantity')),
            'items_centavos' => $items,
            'delivery_centavos' => $delivery,
            'total_centavos' => $items + $delivery,
            'currency' => 'PHP',
            'can_checkout' => $lines !== [] && ! array_filter(array_column($lines, 'issue')),
        ];
    }

    /** First blocking issue code, for checkout failures. */
    public static function blockingIssue(array $summary): ?string
    {
        foreach ($summary['groups'] as $group) {
            foreach ($group['items'] as $line) {
                if ($line['issue']) {
                    return $line['issue'] === 'insufficient_stock' ? 'insufficient_stock' : 'cart_changed';
                }
            }
        }

        return $summary['groups'] === [] ? 'cart_changed' : null;
    }
}
