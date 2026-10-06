<?php

/*
 * One racing actor for tests/Postgres: its own PHP process and its own PostgreSQL connection
 * (the pgsql_test Neon branch), released at a shared start time so the two actors really overlap.
 * Prints one JSON line with the outcome.
 *
 * Usage: php worker.php <startAt> checkout <buyerEmail> <idempotencyKey>
 *        php worker.php <startAt> cancel   <sellerOrderId> <buyerEmail>
 *        php worker.php <startAt> advance  <sellerOrderId> <sellerEmail>
 */

use App\Http\ApiException;
use App\Models\User;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Checkout\PlaceOrder;
use App\Modules\Orders\OrderStatus;
use App\Modules\Orders\OrderTransitions;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.default' => 'pgsql_test']);

[, $startAt, $action, $subject, $extra] = $argv;

// Everything that is not part of the race (loading users, cart versions, connecting) happens first.
$prepare = match ($action) {
    'checkout' => function () use ($subject, $extra) {
        $buyer = User::where('email', $subject)->sole();
        $version = Cart::where('buyer_user_id', $buyer->id)->value('version');

        return fn () => app(PlaceOrder::class)($buyer, $extra, [
            'cart_version' => $version,
            'address' => ['recipient_name' => $buyer->name, 'address_line' => '1 Race Street', 'city' => 'Quezon City', 'postcode' => '1100', 'delivery_note' => null],
            'demo_outcome' => 'success',
        ])[0]->only(['state', 'failure_code']);
    },
    'cancel' => function () use ($subject, $extra) {
        $buyer = User::where('email', $extra)->sole();

        return fn () => ['status' => OrderTransitions::cancel($subject, 1, $buyer, 'buyer', null)->status->value];
    },
    'advance' => function () use ($subject, $extra) {
        $seller = User::where('email', $extra)->sole();

        return fn () => ['status' => OrderTransitions::advance($subject, OrderStatus::Processing, 1, $seller)->status->value];
    },
};
$run = $prepare();
DB::select('select 1'); // warm connection

while (microtime(true) < (float) $startAt) {
    usleep(1000);
}

try {
    echo json_encode(['ok' => true] + $run()), PHP_EOL;
} catch (ApiException $e) {
    echo json_encode(['ok' => false, 'code' => $e->errorCode]), PHP_EOL;
}
