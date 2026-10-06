<?php

namespace App\Modules\Sellers\Models;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use App\Modules\Sellers\ReviewState;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Seller extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return ['status' => ReviewState::class];
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** @return HasMany<SellerApplication, $this> */
    public function applications(): HasMany
    {
        return $this->hasMany(SellerApplication::class);
    }
}
