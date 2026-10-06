<?php

namespace App\Modules\Catalog\Http;

use App\Http\Paginated;
use App\Modules\Catalog\Category;
use App\Modules\Catalog\Models\Product;
use App\Modules\Sellers\Models\Seller;
use App\Modules\Sellers\ReviewState;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** API-01: public catalog. Only published products from approved sellers. */
class ProductController
{
    private const SORTS = [
        'featured' => ['title', 'asc'],
        'price_asc' => ['price_centavos', 'asc'],
        'price_desc' => ['price_centavos', 'desc'],
        'newest' => ['created_at', 'desc'],
    ];

    public function index(Request $request): JsonResponse
    {
        $input = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', Rule::enum(Category::class)],
            'seller' => ['nullable', 'string', 'max:26'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'in_stock' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(array_keys(self::SORTS))],
            ...Paginated::RULES,
        ]);
        [$column, $direction] = self::SORTS[$input['sort'] ?? 'featured'];

        $page = Product::query()
            ->published()
            ->with(['seller', 'inventory'])
            ->when($input['q'] ?? null, fn (Builder $b, string $q) => $b->whereRaw('lower(title) like ?', ['%'.mb_strtolower($q).'%']))
            ->when($input['category'] ?? null, fn (Builder $b, string $c) => $b->where('category', $c))
            ->when($input['seller'] ?? null, fn (Builder $b, string $s) => $b->where('seller_id', $s))
            ->when(isset($input['min_price']), fn (Builder $b) => $b->where('price_centavos', '>=', $input['min_price']))
            ->when(isset($input['max_price']), fn (Builder $b) => $b->where('price_centavos', '<=', $input['max_price']))
            ->when($request->boolean('in_stock'), fn (Builder $b) => $b->whereHas('inventory', fn (Builder $i) => $i->where('available_quantity', '>', 0)))
            ->orderBy($column, $direction)
            ->orderBy('id')
            ->paginate(Paginated::perPage($input));

        // Shop filter options (UI-02); approved sellers only.
        $sellers = Seller::where('status', ReviewState::Approved)->orderBy('name')->get(['id', 'name'])->toArray();

        return Paginated::response($page, ProductResource::class, ['sellers' => $sellers]);
    }

    public function show(string $slug): ProductResource
    {
        return new ProductResource(
            Product::query()->published()->with(['seller', 'inventory'])->where('slug', $slug)->firstOrFail()
        );
    }
}
