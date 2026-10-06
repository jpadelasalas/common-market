<?php

namespace App\Modules\Orders\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

/** Simulated payment record (ADR-05). No money moves. */
class DemoPayment extends Model
{
    use HasUlids;
}
