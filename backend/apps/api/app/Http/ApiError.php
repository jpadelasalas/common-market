<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Context;

/** Hand-built error in the common contract, for conflicts that also return authoritative data. */
final class ApiError
{
    public static function response(int $status, string $code, string $message, mixed $data = null): JsonResponse
    {
        return response()->json(array_filter([
            'code' => $code,
            'message' => $message,
            'request_id' => Context::get('request_id'),
            'data' => $data,
        ], fn ($v) => $v !== null), $status);
    }
}
