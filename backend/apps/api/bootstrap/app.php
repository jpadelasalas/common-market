<?php

use App\Http\ApiException;
use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(AssignRequestId::class);
        $middleware->append(SecurityHeaders::class);
        // Sanctum SPA cookie sessions + CSRF for /api requests from SANCTUM_STATEFUL_DOMAINS (ADR-04).
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API common contract: { code, message, errors?, request_id } for every JSON error.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! ($request->is('api/*', 'auth/*') || $request->expectsJson())) {
                return null;
            }

            $status = match (true) {
                $e instanceof ValidationException => 422,
                $e instanceof AuthenticationException => 401,
                $e instanceof HttpExceptionInterface => $e->getStatusCode(),
                default => 500,
            };
            $code = $e instanceof ApiException ? $e->errorCode : match ($status) {
                401 => 'unauthenticated',
                403 => 'forbidden',
                404 => 'not_found',
                405 => 'method_not_allowed',
                409 => 'conflict',
                419 => 'csrf_token_mismatch',
                422 => 'validation_failed',
                429 => 'too_many_requests',
                default => $status >= 500 ? 'server_error' : 'http_error',
            };

            return response()->json(array_filter([
                'code' => $code,
                // Never leak internals: 5xx and framework 404 texts get a fixed message.
                'message' => $status >= 500 ? 'Something went wrong.' : match ($status) {
                    404 => 'Not found.',
                    default => $e->getMessage() ?: 'Request failed.',
                },
                'errors' => $e instanceof ValidationException ? $e->errors() : null,
                'request_id' => Context::get('request_id'),
            ], fn ($v) => $v !== null), $status, $e instanceof HttpExceptionInterface ? $e->getHeaders() : []);
        });
    })->create();
