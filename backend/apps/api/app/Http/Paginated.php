<?php

namespace App\Http;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

/** API common contract: `data` plus `meta.page`, `meta.per_page`, `meta.total`; 24 per page, max 100. */
final class Paginated
{
    public const RULES = [
        'page' => ['nullable', 'integer', 'min:1'],
        'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
    ];

    public static function perPage(array $input): int
    {
        return (int) ($input['per_page'] ?? 24);
    }

    /** @param  class-string<\Illuminate\Http\Resources\Json\JsonResource>|Closure  $present */
    public static function response(LengthAwarePaginator $page, string|Closure $present, array $meta = []): JsonResponse
    {
        $items = $present instanceof Closure
            ? array_map($present, $page->items())
            : $present::collection($page->items())->resolve();

        return response()->json([
            'data' => $items,
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total()] + $meta,
        ]);
    }
}
