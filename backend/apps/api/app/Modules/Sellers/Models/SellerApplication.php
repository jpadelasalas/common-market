<?php

namespace App\Modules\Sellers\Models;

use App\Models\User;
use App\Modules\Sellers\ReviewState;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerApplication extends Model
{
    use HasUlids;

    protected function casts(): array
    {
        return ['state' => ReviewState::class, 'reviewed_at' => 'datetime', 'version' => 'integer', 'number' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    /** @return BelongsTo<Seller, $this> */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }
}
