<?php

namespace App\Modules\Orders\Http;

use App\Http\Paginated;
use App\Modules\Orders\Models\SellerOrder;
use App\Modules\Orders\OrderStatus;
use App\Modules\Orders\OrderTransitions;
use App\Modules\Orders\PurchasePresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** API-08: the approved seller's own orders. Every query starts from the signed-in seller. */
class SellerOrderController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'q' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'in:newest,oldest'],
            ...Paginated::RULES,
        ]);
        $seller = $request->user()->seller;
        $own = fn () => SellerOrder::where('seller_id', $seller->id);

        $page = $own()
            ->with(['purchase', 'seller', 'items'])
            ->when($input['status'] ?? null, fn (Builder $b, string $s) => $b->where('status', $s))
            ->when($input['q'] ?? null, function (Builder $b, string $q) {
                // Order number (KL-1001 or 1001) or buyer name.
                $number = (int) preg_replace('/\D/', '', $q);
                $b->whereHas('purchase', fn (Builder $p) => $p
                    ->whereRaw('lower(recipient_name) like ?', ['%'.mb_strtolower($q).'%'])
                    ->when($number > 0, fn (Builder $p) => $p->orWhere('number', $number)));
            })
            ->orderBy('created_at', ($input['sort'] ?? 'newest') === 'newest' ? 'desc' : 'asc')
            ->orderBy('id')
            ->paginate(Paginated::perPage($input));

        $counts = $own()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Paginated::response($page, fn (SellerOrder $o) => [
            'id' => $o->id,
            'reference' => $o->reference(),
            'buyer_name' => $o->purchase->recipient_name,
            'item_count' => $o->items->sum('quantity'),
            'total_centavos' => $o->total_centavos,
            'status' => $o->status->value,
            'placed_at' => $o->created_at->toIso8601String(),
        ], ['counts' => array_map('intval', $counts->all())]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->present($this->own($request, $id))]);
    }

    public function transition(Request $request, string $id): JsonResponse
    {
        $input = $request->validate([
            'to' => ['required', Rule::in(['processing', 'shipped', 'delivered'])],
            'expected_version' => ['required', 'integer', 'min:1'],
            'dispatch_reference' => ['nullable', 'string', 'max:64'],
        ]);
        $order = $this->own($request, $id);

        OrderTransitions::advance($order->id, OrderStatus::from($input['to']), (int) $input['expected_version'],
            $request->user(), $input['dispatch_reference'] ?? null);

        return response()->json(['data' => $this->present($this->own($request, $id))]);
    }

    /** Another seller's order is simply not found (AC-14/AC-16). */
    private function own(Request $request, string $id): SellerOrder
    {
        return SellerOrder::where('seller_id', $request->user()->seller->id)
            ->with(['purchase', 'seller', 'items', 'events'])
            ->findOrFail($id);
    }

    private function present(SellerOrder $order): array
    {
        return PurchasePresenter::order($order) + [
            'buyer_name' => $order->purchase->recipient_name,
            'address' => PurchasePresenter::address($order->purchase),
        ];
    }
}
