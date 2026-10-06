<?php

namespace App\Modules\Catalog\Http;

use App\Http\ApiException;
use App\Http\Paginated;
use App\Modules\Administration\Audit;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Visibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * API-10 moderation (AC-19, BR-11): admins unpublish listings with a reason and later clear the
 * restriction. Order item snapshots are separate rows, so purchases never change. Admin cannot
 * edit listing content or stock (security matrix).
 */
class ModerationController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'visibility' => ['nullable', Rule::enum(Visibility::class)],
            ...Paginated::RULES,
        ]);

        $page = Product::query()
            ->with('seller')
            ->when($input['q'] ?? null, fn (Builder $b, string $q) => $b->where(fn (Builder $w) => $w
                ->whereRaw('lower(title) like ?', ['%'.mb_strtolower($q).'%'])
                ->orWhereHas('seller', fn (Builder $s) => $s->whereRaw('lower(name) like ?', ['%'.mb_strtolower($q).'%']))))
            ->when($input['visibility'] ?? null, fn (Builder $b, string $v) => $b->where('visibility', $v))
            ->orderByRaw("case visibility when 'moderated' then 0 when 'published' then 1 else 2 end")
            ->orderBy('title')
            ->paginate(Paginated::perPage($input));

        return Paginated::response($page, fn (Product $p) => self::present($p));
    }

    public function moderate(Request $request, string $id): JsonResponse
    {
        $input = $request->validate([
            'action' => ['required', 'in:unpublish,clear'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ], ['reason.required' => 'Moderation needs a reason the seller can act on.']);

        $product = DB::transaction(function () use ($id, $input) {
            $product = Product::lockForUpdate()->findOrFail($id);
            [$from, $to] = $input['action'] === 'unpublish'
                ? [Visibility::Published, Visibility::Moderated]
                : [Visibility::Moderated, Visibility::Draft]; // cleared: the seller decides when to republish
            if ($product->visibility !== $from) {
                throw new ApiException(409, 'invalid_transition', $input['action'] === 'unpublish'
                    ? 'Only published listings can be unpublished by moderation.'
                    : 'This listing has no moderation restriction to clear.');
            }
            if ($product->version !== (int) $input['expected_version']) {
                throw new ApiException(409, 'stale_version', 'This listing changed since you opened it. Review it again.');
            }

            $product->forceFill([
                'visibility' => $to,
                'moderation_reason' => $to === Visibility::Moderated ? $input['reason'] : null,
                'moderated_at' => $to === Visibility::Moderated ? now() : null,
                'version' => $product->version + 1,
            ])->save();
            Audit::record($input['action'] === 'unpublish' ? 'product.moderated' : 'product.moderation_cleared', $product, ['reason' => $input['reason']]);

            return $product;
        });

        return response()->json(['data' => self::present($product->load('seller'))]);
    }

    private static function present(Product $p): array
    {
        return [
            'id' => $p->id,
            'sku' => $p->sku,
            'slug' => $p->slug,
            'title' => $p->title,
            'image_url' => $p->image_url,
            'price_centavos' => $p->price_centavos,
            'seller' => ['id' => $p->seller->id, 'name' => $p->seller->name],
            'visibility' => $p->visibility->value,
            'moderation_reason' => $p->moderation_reason,
            'moderated_at' => $p->moderated_at ? \Illuminate\Support\Carbon::parse($p->moderated_at)->toIso8601String() : null,
            'version' => $p->version,
        ];
    }
}
