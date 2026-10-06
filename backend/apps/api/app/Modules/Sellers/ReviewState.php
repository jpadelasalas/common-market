<?php

namespace App\Modules\Sellers;

/** Shared by seller status and seller application state (state-models.md). */
enum ReviewState: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
