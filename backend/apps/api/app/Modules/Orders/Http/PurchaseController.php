<?php

namespace App\Modules\Orders\Http;

use App\Http\Paginated;
use App\Modules\Orders\Models\Purchase;
use App\Modules\Orders\PurchasePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** API-04: buyer-scoped purchase history. Another buyer's ID is not found (AC-12). */
class PurchaseController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate(Paginated::RULES);

        $page = Purchase::where('buyer_user_id', $request->user()->id)
            ->with('sellerOrders.seller')
            ->latest()
            ->paginate(Paginated::perPage($input));

        return Paginated::response($page, PurchasePresenter::summary(...));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $purchase = Purchase::where('buyer_user_id', $request->user()->id)->findOrFail($id);

        return response()->json(['data' => PurchasePresenter::detail($purchase)]);
    }
}
