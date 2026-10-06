<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

/** Immutable snapshot of what was bought (BR-08). */
class OrderItem extends Model
{
    use HasUlids;
}
