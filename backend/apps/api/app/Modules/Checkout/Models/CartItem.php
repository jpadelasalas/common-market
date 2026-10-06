<?php

namespace App\Modules\Checkout\Models;

use App\Modules\Catalog\Models\Product;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    use HasUlids;

    // Set only from server-validated values (quantity) and catalog records (product, price).
    protected $fillable = ['product_id', 'quantity', 'unit_price_centavos'];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'unit_price_centavos' => 'integer'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
