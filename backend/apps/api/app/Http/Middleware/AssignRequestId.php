<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every request an ID for logs, error bodies and the X-Request-Id response header.
 * A well-formed incoming ID (e.g. from the proxy) is kept; anything else is replaced.
 */
class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = $request->headers->get('X-Request-Id');
        if (! is_string($id) || ! preg_match('/^[A-Za-z0-9-]{8,64}$/', $id)) {
            $id = (string) Str::uuid();
        }

        Context::add('request_id', $id); // attached to every log entry

        $response = $next($request);
        $response->headers->set('X-Request-Id', $id);

        return $response;
    }
}
