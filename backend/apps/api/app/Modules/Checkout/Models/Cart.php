<?php

namespace App\Modules\Checkout\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    use HasUlids;

    protected $fillable = ['buyer_user_id'];

    protected function casts(): array
    {
        return ['version' => 'integer'];
    }

    /** @return HasMany<CartItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }
}
