<?php

namespace App\Modules\Checkout\Http;

use App\Http\ApiError;
use App\Modules\Catalog\Models\Product;
use App\Modules\Checkout\CartSummary;
use App\Modules\Checkout\Models\Cart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** API-02: the signed-in buyer's cart. Prices always come from the catalog, never the client. */
class CartController
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => CartSummary::of($this->cart($request))]);
    }

    public function put(Request $request, string $productId): JsonResponse
    {
        $quantity = (int) $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:'.CartSummary::MAX_PER_LINE],
        ])['quantity'];

        $product = Product::query()->published()->with('inventory')->findOrFail($productId);
        $cart = $this->cart($request);

        $available = $product->inventory?->available_quantity ?? 0;
        if ($quantity > $available) {
            return ApiError::response(409, 'insufficient_stock',
                $available ? "Only $available available." : 'This product is out of stock.', CartSummary::of($cart));
        }

        // Saving also records the current price, which is how a buyer accepts a changed price.
        $cart->items()->updateOrCreate(
            ['product_id' => $product->id],
            ['quantity' => $quantity, 'unit_price_centavos' => $product->price_centavos],
        );
        $cart->increment('version');

        return response()->json(['data' => CartSummary::of($cart->unsetRelation('items'))]);
    }

    public function destroy(Request $request, string $productId): JsonResponse
    {
        $cart = $this->cart($request);
        if ($cart->items()->where('product_id', $productId)->delete()) {
            $cart->increment('version');
        }

        return response()->json(['data' => CartSummary::of($cart->unsetRelation('items'))]);
    }

    private function cart(Request $request): Cart
    {
        return Cart::firstOrCreate(['buyer_user_id' => $request->user()->id])->refresh();
    }
}
