<?php

namespace App\Modules\Orders;

/** Seller order fulfilment states (state-models.md). Transitions arrive in Phase 4. */
enum OrderStatus: string
{
    case Placed = 'placed';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
}
