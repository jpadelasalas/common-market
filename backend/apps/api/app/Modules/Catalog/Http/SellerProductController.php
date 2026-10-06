<?php

namespace App\Modules\Catalog\Http;

use App\Http\ApiError;
use App\Http\ApiException;
use App\Http\Paginated;
use App\Modules\Administration\Audit;
use App\Modules\Catalog\Category;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\Product;
use App\Modules\Catalog\Visibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * API-06/API-07: the approved seller's own catalog and stock (AC-13..AC-15). Route middleware
 * requires `can:act-as-seller`; every query starts from the signed-in seller, so another seller's
 * product is not found (404). Writes carry the version the seller loaded; a stale version returns
 * 409 with the current record so the editor can keep the seller's input (AC-15).
 */
class SellerProductController
{
    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'visibility' => ['nullable', Rule::enum(Visibility::class)],
            ...Paginated::RULES,
        ]);

        $page = $request->user()->seller->products()
            ->with('inventory')
            ->when($input['q'] ?? null, fn (Builder $b, string $q) => $b->where(fn (Builder $w) => $w
                ->whereRaw('lower(title) like ?', ['%'.mb_strtolower($q).'%'])
                ->orWhereRaw('lower(sku) like ?', ['%'.mb_strtolower($q).'%'])))
            ->when($input['visibility'] ?? null, fn (Builder $b, string $v) => $b->where('visibility', $v))
            ->orderBy('sku')
            ->paginate(Paginated::perPage($input));

        return Paginated::response($page, SellerProductResource::class);
    }

    public function show(Request $request, string $id): SellerProductResource
    {
        return new SellerProductResource($this->own($request, $id));
    }

    /** New goods always start as drafts (AC-13). */
    public function store(Request $request): JsonResponse
    {
        $input = $request->validate($this->rules(required: true) + [
            'available_quantity' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);
        $seller = $request->user()->seller;

        $product = DB::transaction(function () use ($input, $seller) {
            $next = $seller->products()->count() + 1;
            $slug = Str::slug($input['title']);
            $product = Product::forceCreate(array_intersect_key($input, $this->rules(true)) + [
                'seller_id' => $seller->id,
                'sku' => sprintf('%s-%03d', $seller->code, $next),
                'slug' => Product::where('slug', $slug)->exists() ? $slug.'-'.Str::lower(Str::random(5)) : $slug,
                'visibility' => Visibility::Draft,
            ]);
            $product->inventory()->forceCreate(['available_quantity' => $input['available_quantity'] ?? 0]);
            Audit::record('product.created', $product, ['sku' => $product->sku]);

            return $product;
        });

        return (new SellerProductResource($product->load('inventory')))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $input = $request->validate($this->rules(required: false) + ['expected_version' => ['required', 'integer', 'min:1']]);

        return $this->versioned($request, $id, (int) $input['expected_version'], function (Product $product) use ($input) {
            $changes = array_intersect_key($input, $this->rules(false));
            $product->forceFill($changes + ['version' => $product->version + 1])->save();
            Audit::record('product.updated', $product, ['fields' => array_keys($changes)]);
        });
    }

    /** Stock edits are versioned separately from listing edits; BR-09 forbids negative stock. */
    public function inventory(Request $request, string $id): JsonResponse
    {
        $input = $request->validate([
            'available_quantity' => ['required', 'integer', 'min:0', 'max:100000'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ]);
        $product = $this->own($request, $id);

        return DB::transaction(function () use ($request, $id, $product, $input) {
            $inventory = Inventory::where('product_id', $product->id)->lockForUpdate()->sole();
            if ($inventory->version !== (int) $input['expected_version']) {
                return ApiError::response(409, 'stale_version', 'Stock changed since you loaded it (for example, a new order). Review the current stock and save again.',
                    (new SellerProductResource($this->own($request, $id)))->resolve());
            }
            $from = $inventory->available_quantity;
            $inventory->forceFill(['available_quantity' => (int) $input['available_quantity'], 'version' => $inventory->version + 1])->save();
            Audit::record('inventory.updated', $product, ['from' => $from, 'to' => (int) $input['available_quantity']]);

            return (new SellerProductResource($this->own($request, $id)))->response();
        });
    }

    public function publish(Request $request, string $id): JsonResponse
    {
        $version = (int) $request->validate(['expected_version' => ['required', 'integer', 'min:1']])['expected_version'];

        return $this->versioned($request, $id, $version, function (Product $product) {
            if ($product->visibility === Visibility::Moderated) {
                throw new ApiException(409, 'moderation_hold', 'An administrator unpublished this listing. It needs admin clearance before it can be published again.');
            }
            $product->forceFill(['visibility' => Visibility::Published, 'version' => $product->version + 1])->save();
            Audit::record('product.published', $product);
        }, replayIf: Visibility::Published);
    }

    public function unpublish(Request $request, string $id): JsonResponse
    {
        $version = (int) $request->validate(['expected_version' => ['required', 'integer', 'min:1']])['expected_version'];

        return $this->versioned($request, $id, $version, function (Product $product) {
            if ($product->visibility !== Visibility::Published) {
                return;
            }
            $product->forceFill(['visibility' => Visibility::Draft, 'version' => $product->version + 1])->save();
            Audit::record('product.unpublished', $product);
        }, replayIf: Visibility::Draft);
    }

    /** Lock, check the version (unless already in the requested state), apply, return the current record. */
    private function versioned(Request $request, string $id, int $expected, callable $apply, ?Visibility $replayIf = null): JsonResponse
    {
        $this->own($request, $id);

        return DB::transaction(function () use ($request, $id, $expected, $apply, $replayIf) {
            $product = Product::lockForUpdate()->findOrFail($id);
            if (! ($replayIf && $product->visibility === $replayIf)) {
                if ($product->version !== $expected) {
                    return ApiError::response(409, 'stale_version', 'This product changed since you opened it. Your edits are kept; review the current version and save again.',
                        (new SellerProductResource($this->own($request, $id)))->resolve());
                }
                $apply($product);
            }

            return (new SellerProductResource($this->own($request, $id)))->response();
        });
    }

    private function own(Request $request, string $id): Product
    {
        return $request->user()->seller->products()->with('inventory')->findOrFail($id);
    }

    private function rules(bool $required): array
    {
        $r = $required ? 'required' : 'sometimes';

        return [
            'title' => [$r, 'string', 'min:3', 'max:120'],
            'category' => [$r, Rule::enum(Category::class)],
            'description' => [$r, 'string', 'min:10', 'max:2000'],
            'price_centavos' => [$r, 'integer', 'min:100', 'max:10000000'],
            'material' => ['sometimes', 'nullable', 'string', 'max:80'],
            'dimensions' => ['sometimes', 'nullable', 'string', 'max:80'],
            // ponytail: seeded https image references only; real uploads need type/size checks (security matrix).
            'image_url' => ['sometimes', 'nullable', 'url:https', 'max:500'],
        ];
    }
}
