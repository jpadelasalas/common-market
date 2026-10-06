<?php

namespace App\Http;

use Symfony\Component\HttpKernel\Exception\HttpException;

/** HTTP error with a stable machine-readable `code` (API common contract). */
final class ApiException extends HttpException
{
    public function __construct(int $status, public readonly string $errorCode, string $message)
    {
        parent::__construct($status, $message);
    }
}
