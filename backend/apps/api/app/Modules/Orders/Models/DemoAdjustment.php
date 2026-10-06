<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

/** Simulated refund for a cancelled seller order (ADR-05). No money moves. */
class DemoAdjustment extends Model
{
    use HasUlids;
}
