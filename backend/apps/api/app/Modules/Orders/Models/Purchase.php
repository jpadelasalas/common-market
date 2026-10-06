<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Purchase extends Model
{
    use HasUlids;

    public function reference(): string
    {
        return 'CM-'.$this->number;
    }

    /** @return HasMany<SellerOrder, $this> */
    public function sellerOrders(): HasMany
    {
        return $this->hasMany(SellerOrder::class)->orderBy('sequence');
    }

    /** @return HasOne<DemoPayment, $this> */
    public function payment(): HasOne
    {
        return $this->hasOne(DemoPayment::class);
    }
}
