<?php

namespace App\Modules\Orders\Models;

use App\Modules\Orders\OrderStatus;
use App\Modules\Sellers\Models\Seller;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellerOrder extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'version' => 'integer',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /** Shop-prefixed order reference, e.g. KL-1001 (needs seller and purchase loaded). */
    public function reference(): string
    {
        return $this->seller->code.'-'.$this->purchase->number;
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, [OrderStatus::Placed, OrderStatus::Processing], true);
    }

    /** @return BelongsTo<Purchase, $this> */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    /** @return BelongsTo<Seller, $this> */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return HasMany<OrderEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->orderBy('created_at')->orderBy('id');
    }
}
