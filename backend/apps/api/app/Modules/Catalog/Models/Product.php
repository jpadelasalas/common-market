<?php

namespace App\Modules\Catalog\Models;

use App\Modules\Catalog\Category;
use App\Modules\Catalog\Visibility;
use App\Modules\Sellers\Models\Seller;
use App\Modules\Sellers\ReviewState;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'category' => Category::class,
            'visibility' => Visibility::class,
            'price_centavos' => 'integer',
            'version' => 'integer',
        ];
    }

    /** Publicly purchasable: published listing from an approved seller. */
    public function scopePublished(Builder $query): void
    {
        $query->where('visibility', Visibility::Published)
            ->whereHas('seller', fn (Builder $s) => $s->where('status', ReviewState::Approved));
    }

    /** @return BelongsTo<Seller, $this> */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    /** @return HasOne<Inventory, $this> */
    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }
}
