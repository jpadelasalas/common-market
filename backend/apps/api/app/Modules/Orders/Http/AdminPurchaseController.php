<?php

namespace App\Modules\Orders\Http;

use App\Http\Paginated;
use App\Modules\Orders\Models\Purchase;
use App\Modules\Orders\PurchasePresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API-10 oversight (AC-20): read-only. Payment and per-seller fulfilment stay separate, and there
 * are no transition shortcuts here; status changes belong to the owning seller or buyer.
 */
class AdminPurchaseController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'payment' => ['nullable', 'in:succeeded,partially_refunded,refunded'],
            ...Paginated::RULES,
        ]);

        $page = Purchase::query()
            ->with(['sellerOrders.seller', 'payment'])
            ->when($input['q'] ?? null, function (Builder $b, string $q) {
                $number = (int) preg_replace('/\D/', '', $q);
                $b->where(fn (Builder $w) => $w
                    ->whereRaw('lower(recipient_name) like ?', ['%'.mb_strtolower($q).'%'])
                    ->when($number > 0, fn (Builder $w) => $w->orWhere('number', $number)));
            })
            ->when($input['payment'] ?? null, fn (Builder $b, string $s) => $b->whereHas('payment', fn (Builder $p) => $p->where('status', $s)))
            ->latest()
            ->orderByDesc('number')
            ->paginate(Paginated::perPage($input));

        return Paginated::response($page, fn (Purchase $p) => PurchasePresenter::summary($p) + ['buyer_name' => $p->recipient_name]);
    }

    public function show(string $id): JsonResponse
    {
        $purchase = Purchase::findOrFail($id);

        return response()->json(['data' => PurchasePresenter::detail($purchase) + ['buyer_name' => $purchase->recipient_name]]);
    }
}
