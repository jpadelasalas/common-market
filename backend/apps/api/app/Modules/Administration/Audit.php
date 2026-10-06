<?php

namespace App\Modules\Administration;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Append-only audit trail (security matrix): actor, entity, action, safe changed fields, request ID.
 * Call inside the same transaction as the change so both commit or neither does.
 */
final class Audit
{
    public static function record(string $action, Model $entity, array $changes = []): void
    {
        DB::table('audit_events')->insert([
            'id' => (string) Str::ulid(),
            'actor_user_id' => Auth::id(),
            'action' => $action,
            'entity_type' => Str::snake(class_basename($entity)),
            'entity_id' => $entity->getKey(),
            'changes' => $changes ? json_encode($changes) : null,
            'request_id' => Context::get('request_id'),
            'created_at' => now(),
        ]);
    }
}
