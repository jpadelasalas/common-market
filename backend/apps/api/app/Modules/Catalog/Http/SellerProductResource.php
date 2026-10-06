<?php

namespace App\Modules\Catalog\Http;

use App\Modules\Catalog\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Owning seller's view: listing fields plus SKU, stock, visibility and versions for editing.
 *
 * @mixin Product
 */
class SellerProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'slug' => $this->slug,
            'title' => $this->title,
            'category' => $this->category->value,
            'description' => $this->description,
            'material' => $this->material,
            'dimensions' => $this->dimensions,
            'image_url' => $this->image_url,
            'price_centavos' => $this->price_centavos,
            'currency' => 'PHP',
            'visibility' => $this->visibility->value,
            'moderation_reason' => $this->moderation_reason,
            'version' => $this->version,
            'available_quantity' => $this->inventory?->available_quantity ?? 0,
            'inventory_version' => $this->inventory?->version ?? 1,
        ];
    }
}
