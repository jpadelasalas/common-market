<?php

namespace App\Modules\Checkout\Http;

use App\Http\ApiError;
use App\Modules\Checkout\CartSummary;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Checkout\Models\CheckoutAttempt;
use App\Modules\Checkout\PlaceOrder;
use App\Modules\Orders\PurchasePresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** API-03: idempotent demo checkout and attempt reconciliation. */
class CheckoutAttemptController
{
    private const MESSAGES = [
        'cart_changed' => 'Your cart changed since you reviewed it. Review the updated cart before placing the order.',
        'insufficient_stock' => 'Some items no longer have enough stock. Update your cart before placing the order.',
    ];

    public function store(Request $request, PlaceOrder $placeOrder): JsonResponse
    {
        $key = $request->header('Idempotency-Key');
        if (! is_string($key) || ! preg_match('/^[A-Za-z0-9-]{8,64}$/', $key)) {
            throw ValidationException::withMessages(['idempotency_key' => 'A valid Idempotency-Key header is required.']);
        }

        $input = $request->validate([
            'cart_version' => ['required', 'integer', 'min:1'],
            'address.recipient_name' => ['required', 'string', 'max:100'],
            'address.address_line' => ['required', 'string', 'max:200'],
            'address.city' => ['required', 'string', 'max:80'],
            'address.postcode' => ['required', 'string', 'regex:/^\d{4}$/'],
            'address.delivery_note' => ['nullable', 'string', 'max:200'],
            'demo_outcome' => ['required', 'in:success,failure'],
        ]);
        $input['address'] += ['delivery_note' => null];

        [$attempt, $created] = $placeOrder($request->user(), $key, $input);

        // Cart problems return the authoritative cart so the buyer can review it (no automatic resubmit).
        if (isset(self::MESSAGES[$attempt->failure_code])) {
            $cart = Cart::where('buyer_user_id', $request->user()->id)->first();

            return ApiError::response(409, $attempt->failure_code, self::MESSAGES[$attempt->failure_code],
                $cart ? CartSummary::of($cart) : null);
        }

        return response()->json(['data' => $this->present($attempt)], $created ? 201 : 200);
    }

    /** Reconcile an unknown outcome (e.g. network drop) before submitting again. */
    public function show(Request $request, string $key): JsonResponse
    {
        $attempt = CheckoutAttempt::where('buyer_user_id', $request->user()->id)
            ->where('idempotency_key', $key)
            ->firstOrFail();

        return response()->json(['data' => $this->present($attempt)]);
    }

    private function present(CheckoutAttempt $attempt): array
    {
        return [
            'key' => $attempt->idempotency_key,
            'state' => $attempt->state,
            'failure_code' => $attempt->failure_code,
            'purchase' => $attempt->purchase ? PurchasePresenter::detail($attempt->purchase) : null,
        ];
    }
}
