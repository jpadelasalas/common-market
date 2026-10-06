<?php

namespace App\Modules\Catalog\Http;

use App\Modules\Catalog\Models\Product;
use App\Modules\Checkout\CartSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Public product card/detail. Exact stock and moderation fields stay internal.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->category->value,
            'description' => $this->description,
            'material' => $this->material,
            'dimensions' => $this->dimensions,
            'image_url' => $this->image_url,
            'price_centavos' => $this->price_centavos,
            'currency' => 'PHP',
            'in_stock' => ($this->inventory?->available_quantity ?? 0) > 0,
            'max_quantity' => min(CartSummary::MAX_PER_LINE, $this->inventory?->available_quantity ?? 0),
            'delivery_centavos' => CartSummary::DELIVERY_CENTAVOS,
            'seller' => ['id' => $this->seller->id, 'name' => $this->seller->name],
        ];
    }
}
