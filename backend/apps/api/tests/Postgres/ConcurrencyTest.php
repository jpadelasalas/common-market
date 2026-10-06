<?php

namespace Tests\Postgres;

use App\Models\User;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\Product;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Checkout\PlaceOrder;
use App\Modules\Orders\Models\DemoAdjustment;
use App\Modules\Orders\Models\Purchase;
use App\Modules\Orders\Models\SellerOrder;
use Database\Seeders\CatalogSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * TC-03 / TC-04 / TC-05 under real concurrency (PostgreSQL row locks, two connections).
 * Runs only with DB_TEST_URL set; the Neon test branch is wiped once per run.
 *
 *   php artisan test --testsuite=Postgres
 */
class ConcurrencyTest extends TestCase
{
    private static bool $migrated = false;

    protected function setUp(): void
    {
        parent::setUp();
        if (! config('database.connections.pgsql_test.url')) {
            $this->markTestSkipped('Set DB_TEST_URL (Neon test branch) to run PostgreSQL concurrency tests.');
        }
        config(['database.default' => 'pgsql_test']);
        // This suite wipes its database: never run it against anything not explicitly named *_test.
        $database = DB::connection('pgsql_test')->getDatabaseName();
        if (! str_ends_with($database, '_test')) {
            $this->fail("Refusing to wipe database '$database': DB_TEST_URL must point at a *_test database.");
        }
        if (! self::$migrated) {
            $this->artisan('migrate:fresh', ['--seed' => true, '--seeder' => CatalogSeeder::class, '--force' => true])->assertSuccessful();
            self::$migrated = true;
        }
    }

    /** Start two worker processes that act at the same instant; returns their decoded outcomes. */
    private function race(array $a, array $b): array
    {
        $startAt = (string) (microtime(true) + 8); // time for both processes to boot and connect
        $procs = [];
        $outputs = [];
        foreach ([$a, $b] as $args) {
            $procs[] = proc_open([PHP_BINARY, __DIR__.'/worker.php', $startAt, ...$args], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
            $outputs[] = $pipes;
        }
        $results = [];
        foreach ($procs as $i => $proc) {
            $out = stream_get_contents($outputs[$i][1]);
            $err = stream_get_contents($outputs[$i][2]);
            proc_close($proc);
            preg_match('/^\{.*\}(?=\r?$)/m', $out, $line); // Windows workers end lines with \r\n
            // Never echo credentials into test output.
            $secret = (string) config('database.connections.pgsql_test.password');
            $safe = $secret === '' ? $out.$err : str_replace([$secret, rawurlencode($secret)], '***', $out.$err);
            $this->assertNotEmpty($line, "worker produced no result:\n".substr($safe, 0, 600));
            $results[] = json_decode($line[0], true);
        }

        return $results;
    }

    private function buyerWithCart(string $email, array $lines): User
    {
        $buyer = User::forceCreate(['name' => ucfirst(strtok($email, '@')), 'email' => $email, 'password' => 'demo-password', 'role' => 'buyer']);
        $cart = Cart::firstOrCreate(['buyer_user_id' => $buyer->id]);
        foreach ($lines as $sku => $quantity) {
            $product = Product::where('sku', $sku)->sole();
            $cart->items()->forceCreate(['product_id' => $product->id, 'quantity' => $quantity, 'unit_price_centavos' => $product->price_centavos]);
        }

        return $buyer;
    }

    private function stock(string $sku): int
    {
        return Inventory::where('product_id', Product::where('sku', $sku)->value('id'))->value('available_quantity');
    }

    public function test_two_buyers_racing_for_the_last_item_get_exactly_one_allocation(): void
    {
        Inventory::where('product_id', Product::where('sku', 'KL-006')->value('id'))->update(['available_quantity' => 1]);
        $this->buyerWithCart('race-a@demo.test', ['KL-006' => 1]);
        $this->buyerWithCart('race-b@demo.test', ['KL-006' => 1]);
        $before = Purchase::count();

        $results = $this->race(['checkout', 'race-a@demo.test', 'race-key-a1'], ['checkout', 'race-b@demo.test', 'race-key-b1']);

        $states = array_column($results, 'state');
        sort($states);
        $this->assertSame(['failed', 'succeeded'], $states, json_encode($results));
        $this->assertContains('insufficient_stock', array_column($results, 'failure_code'));
        $this->assertSame(0, $this->stock('KL-006'));
        $this->assertSame($before + 1, Purchase::count());
    }

    public function test_the_same_checkout_key_submitted_twice_at_once_creates_one_purchase(): void
    {
        $buyer = $this->buyerWithCart('race-c@demo.test', ['KL-001' => 1]);
        $stock = $this->stock('KL-001');

        $results = $this->race(['checkout', 'race-c@demo.test', 'race-key-c1'], ['checkout', 'race-c@demo.test', 'race-key-c1']);

        $this->assertSame(1, Purchase::where('buyer_user_id', $buyer->id)->count(), json_encode($results));
        $this->assertSame($stock - 1, $this->stock('KL-001'));
        // One request places the order; the other is told it is in progress or replays the result.
        $this->assertContains(['ok' => true, 'state' => 'succeeded', 'failure_code' => null], $results);
    }

    public function test_cancellation_racing_a_fulfilment_step_has_exactly_one_winner(): void
    {
        $buyer = $this->buyerWithCart('race-d@demo.test', ['KL-002' => 2]);
        [$attempt] = app(PlaceOrder::class)($buyer, 'race-key-d1', [
            'cart_version' => Cart::where('buyer_user_id', $buyer->id)->value('version'),
            'address' => ['recipient_name' => 'Race', 'address_line' => '1 Race Street', 'city' => 'Quezon City', 'postcode' => '1100', 'delivery_note' => null],
            'demo_outcome' => 'success',
        ]);
        $order = SellerOrder::where('purchase_id', $attempt->purchase_id)->sole();
        $stockAfterPurchase = $this->stock('KL-002');

        $results = $this->race(['cancel', $order->id, 'race-d@demo.test'], ['advance', $order->id, 'mara@demo.test']);

        $this->assertSame(1, count(array_filter(array_column($results, 'ok'))), json_encode($results));
        $order->refresh();
        $this->assertSame(2, $order->events()->count());
        if ($order->status->value === 'cancelled') {
            $this->assertSame($stockAfterPurchase + 2, $this->stock('KL-002'));
            $this->assertSame(1, DemoAdjustment::where('seller_order_id', $order->id)->count());
        } else {
            $this->assertSame('processing', $order->status->value);
            $this->assertSame($stockAfterPurchase, $this->stock('KL-002'));
            $this->assertSame(0, DemoAdjustment::where('seller_order_id', $order->id)->count());
        }
    }

    /** Regression: SQLite ignores varchar lengths, PostgreSQL rejected 'partially_refunded'. */
    public function test_cancelling_one_of_two_shop_orders_records_a_partial_refund(): void
    {
        $buyer = $this->buyerWithCart('refund-a@demo.test', ['KL-005' => 1, 'DO-004' => 1]);
        [$attempt] = app(PlaceOrder::class)($buyer, 'refund-key-a1', [
            'cart_version' => Cart::where('buyer_user_id', $buyer->id)->value('version'),
            'address' => ['recipient_name' => 'Refund', 'address_line' => '1 Race Street', 'city' => 'Quezon City', 'postcode' => '1100', 'delivery_note' => null],
            'demo_outcome' => 'success',
        ]);
        $first = SellerOrder::where('purchase_id', $attempt->purchase_id)->orderBy('sequence')->firstOrFail();

        \App\Modules\Orders\OrderTransitions::cancel($first->id, 1, $buyer, 'buyer', null);

        $this->assertSame('partially_refunded', DB::table('demo_payments')->where('purchase_id', $attempt->purchase_id)->value('status'));
    }

    public function test_database_rejects_negative_stock_and_prices(): void
    {
        $mug = Product::where('sku', 'KL-001')->sole();

        foreach ([
            fn () => DB::table('inventory')->where('product_id', $mug->id)->update(['available_quantity' => -1]),
            fn () => DB::table('products')->where('id', $mug->id)->update(['price_centavos' => -100]),
        ] as $write) {
            try {
                $write();
                $this->fail('CHECK constraint did not fire');
            } catch (QueryException $e) {
                $this->assertSame('23514', $e->getCode()); // check_violation
            }
        }
    }
}
