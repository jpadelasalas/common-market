<?php

namespace App\Modules\Checkout;

use RuntimeException;

/** Rolls back the checkout transaction and carries the attempt's failure code. */
final class CheckoutFailed extends RuntimeException
{
    public function __construct(public readonly string $failureCode)
    {
        parent::__construct($failureCode);
    }
}
