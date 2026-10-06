<?php

namespace App\Modules\Orders\Models;

use App\Modules\Orders\OrderStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

/** Append-only fulfilment timeline entry. */
class OrderEvent extends Model
{
    use HasUlids;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['from_status' => OrderStatus::class, 'to_status' => OrderStatus::class, 'created_at' => 'datetime'];
    }
}
