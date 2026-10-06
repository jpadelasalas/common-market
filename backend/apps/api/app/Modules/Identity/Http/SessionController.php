<?php

namespace App\Modules\Identity\Http;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/** API-11: first-party cookie session for the shell (ADR-04). No tokens, no password in responses. */
class SessionController
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => self::present($request->user())]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Auth::guard('web')->attempt($credentials)) {
            // Same message whether or not the account exists.
            throw ValidationException::withMessages(['email' => 'Email or password is incorrect.']);
        }

        $request->session()->regenerate();

        return response()->json(['data' => self::present($request->user())]);
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    /** Session contract: id, display name, role, optional seller id/status. */
    private static function present(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role->value,
            'seller' => $user->seller
                ? ['id' => $user->seller->id, 'name' => $user->seller->name, 'status' => $user->seller->status->value]
                : null,
        ];
    }
}
