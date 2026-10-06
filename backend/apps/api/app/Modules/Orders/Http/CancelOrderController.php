<?php

namespace App\Modules\Orders\Http;

use App\Modules\Identity\Role;
use App\Modules\Orders\Models\SellerOrder;
use App\Modules\Orders\OrderTransitions;
use App\Modules\Orders\PurchasePresenter;
use App\Modules\Sellers\ReviewState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** API-05: the owning buyer or the owning approved seller cancels before shipment. */
class CancelOrderController
{
    public function __invoke(Request $request, string $id): JsonResponse
    {
        $input = $request->validate([
            'expected_version' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:200'],
        ]);
        $user = $request->user();

        // Resolve the caller's relationship to the order; anyone else gets 404, not a hint it exists.
        $order = SellerOrder::with('purchase')->findOrFail($id);
        $by = match (true) {
            $user->role === Role::Buyer && $order->purchase->buyer_user_id === $user->id => 'buyer',
            $user->role === Role::Seller && $user->seller?->status === ReviewState::Approved && $order->seller_id === $user->seller->id => 'seller',
            default => abort(404),
        };

        OrderTransitions::cancel($order->id, (int) $input['expected_version'], $user, $by, $input['reason'] ?? null);

        $order = SellerOrder::with(['purchase', 'seller', 'items', 'events'])->findOrFail($id);

        return response()->json(['data' => PurchasePresenter::order($order)]);
    }
}
