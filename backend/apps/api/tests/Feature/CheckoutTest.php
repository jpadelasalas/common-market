<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\Product;
use App\Modules\Orders\Models\Purchase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Database\Seeders\CatalogSeeder;
use Tests\TestCase;

/** TC-02 / TC-03 / TC-04 (sequential) / TC-07 (purchases): Phase 3 vertical slice. */
class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private const ADDRESS = [
        'recipient_name' => 'Alex Rivera',
        'address_line' => '24 Sample Lane, Demo District',
        'city' => 'Quezon City',
        'postcode' => '1100',
    ];

    private function buyer(string $email = 'alex@demo.test'): static
    {
        return $this->actingAs(User::where('email', $email)->sole());
    }

    private function product(string $sku): Product
    {
        return Product::where('sku', $sku)->sole();
    }

    private function stock(string $sku): int
    {
        return Inventory::where('product_id', $this->product($sku)->id)->value('available_quantity');
    }

    /** Canonical fixture CM-1001 (user-flows.md): 2 mugs + 1 towel from Kubo, 1 tray from Daily Objects. */
    private function fillCanonicalCart(): int
    {
        foreach (['KL-001' => 2, 'KL-002' => 1, 'DO-001' => 1] as $sku => $quantity) {
            $version = $this->putJson('/api/v1/cart/items/'.$this->product($sku)->id, ['quantity' => $quantity])
                ->assertOk()
                ->json('data.version');
        }

        return $version;
    }

    private function checkout(string $key, int $version, string $outcome = 'success', array $address = self::ADDRESS): TestResponse
    {
        return $this->withHeader('Idempotency-Key', $key)->postJson('/api/v1/checkout-attempts', [
            'cart_version' => $version,
            'address' => $address,
            'demo_outcome' => $outcome,
        ]);
    }

    public function test_cart_groups_by_seller_with_canonical_totals(): void
    {
        $this->buyer()->fillCanonicalCart();

        $this->getJson('/api/v1/cart')
            ->assertOk()
            ->assertJsonPath('data.groups.0.seller.name', 'Kubo Living')
            ->assertJsonPath('data.groups.0.items.*.title', ['Stoneware mug, oat', 'Cotton hand towel'])
            ->assertJsonPath('data.groups.0.items_centavos', 122000)
            ->assertJsonPath('data.groups.0.delivery_centavos', 8000)
            ->assertJsonPath('data.groups.0.total_centavos', 130000)
            ->assertJsonPath('data.groups.1.seller.name', 'Daily Objects')
            ->assertJsonPath('data.groups.1.total_centavos', 87000)
            ->assertJsonPath('data.items_centavos', 201000)
            ->assertJsonPath('data.delivery_centavos', 16000)
            ->assertJsonPath('data.total_centavos', 217000)
            ->assertJsonPath('data.item_count', 4)
            ->assertJsonPath('data.can_checkout', true);
    }

    public function test_cart_enforces_quantity_limits_stock_and_publication(): void
    {
        $this->buyer();
        $mug = $this->product('KL-001')->id;

        $this->putJson("/api/v1/cart/items/$mug", ['quantity' => 11])->assertStatus(422);
        $this->putJson("/api/v1/cart/items/$mug", ['quantity' => 0])->assertStatus(422);

        $vase = $this->product('KL-006')->id; // 4 in stock
        $this->putJson("/api/v1/cart/items/$vase", ['quantity' => 5])
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock')
            ->assertJsonPath('message', 'Only 4 available.')
            ->assertJsonPath('data.item_count', 0);

        $draft = $this->product('DO-006')->id;
        $this->putJson("/api/v1/cart/items/$draft", ['quantity' => 1])->assertNotFound();

        $this->putJson("/api/v1/cart/items/$mug", ['quantity' => 2])->assertOk();
        $this->deleteJson("/api/v1/cart/items/$mug")->assertOk()->assertJsonPath('data.item_count', 0);
    }

    public function test_successful_checkout_creates_one_purchase_with_one_order_per_seller(): void
    {
        $version = $this->buyer()->fillCanonicalCart();

        $purchase = $this->checkout('attempt-0001', $version)
            ->assertCreated()
            ->assertJsonPath('data.state', 'succeeded')
            ->assertJsonPath('data.purchase.reference', 'CM-1001')
            ->assertJsonPath('data.purchase.total_centavos', 217000)
            ->assertJsonPath('data.purchase.payment', ['status' => 'succeeded', 'simulated' => true])
            ->assertJsonPath('data.purchase.seller_orders.0.reference', 'KL-1001')
            ->assertJsonPath('data.purchase.seller_orders.0.status', 'placed')
            ->assertJsonPath('data.purchase.seller_orders.0.events.0.to_status', 'placed')
            ->assertJsonPath('data.purchase.seller_orders.0.seller.name', 'Kubo Living')
            ->assertJsonPath('data.purchase.seller_orders.0.total_centavos', 130000)
            ->assertJsonPath('data.purchase.seller_orders.1.reference', 'DO-1001')
            ->assertJsonCount(2, 'data.purchase.seller_orders')
            ->json('data.purchase');

        $this->assertSame(10, $this->stock('KL-001'));
        $this->assertSame(8, $this->stock('KL-002'));
        $this->assertSame(7, $this->stock('DO-001'));
        $this->getJson('/api/v1/cart')->assertJsonPath('data.item_count', 0);

        $this->getJson('/api/v1/purchases')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.reference', 'CM-1001');
        $this->getJson('/api/v1/purchases/'.$purchase['id'])
            ->assertOk()
            ->assertJsonPath('data.address.city', 'Quezon City');
    }

    public function test_same_key_and_payload_replays_without_a_second_purchase(): void
    {
        $version = $this->buyer()->fillCanonicalCart();

        $first = $this->checkout('attempt-0002', $version)->assertCreated()->json('data.purchase.id');
        $replay = $this->checkout('attempt-0002', $version)->assertOk()->json('data.purchase.id');

        $this->assertSame($first, $replay);
        $this->assertSame(1, Purchase::count());
        $this->assertSame(10, $this->stock('KL-001'));
    }

    public function test_same_key_with_a_different_payload_conflicts(): void
    {
        $version = $this->buyer()->fillCanonicalCart();
        $this->checkout('attempt-0003', $version)->assertCreated();

        $this->checkout('attempt-0003', $version, 'success', ['city' => 'Pasig City'] + self::ADDRESS)
            ->assertStatus(409)
            ->assertJsonPath('code', 'idempotency_key_reused');
        $this->assertSame(1, Purchase::count());
    }

    public function test_demo_payment_failure_creates_nothing_and_keeps_the_cart(): void
    {
        $version = $this->buyer()->fillCanonicalCart();

        $this->checkout('attempt-0004', $version, 'failure')
            ->assertCreated()
            ->assertJsonPath('data.state', 'failed')
            ->assertJsonPath('data.failure_code', 'demo_payment_declined')
            ->assertJsonPath('data.purchase', null);

        $this->assertSame(0, Purchase::count());
        $this->assertSame(12, $this->stock('KL-001'));
        $this->getJson('/api/v1/cart')->assertJsonPath('data.total_centavos', 217000);

        // A corrected retry uses a fresh key and succeeds.
        $this->checkout('attempt-0005', $version)->assertCreated()->assertJsonPath('data.state', 'succeeded');
        // Reconciliation of the earlier attempt still reports its failure.
        $this->getJson('/api/v1/checkout-attempts/attempt-0004')->assertJsonPath('data.state', 'failed');
    }

    public function test_stale_cart_version_is_rejected_with_the_current_cart(): void
    {
        $version = $this->buyer()->fillCanonicalCart();

        $this->checkout('attempt-0006', $version - 1)
            ->assertStatus(409)
            ->assertJsonPath('code', 'cart_changed')
            ->assertJsonPath('data.version', $version);
        $this->assertSame(0, Purchase::count());
    }

    public function test_changed_price_blocks_checkout_until_accepted(): void
    {
        $version = $this->buyer()->fillCanonicalCart();
        $mug = $this->product('KL-001');
        $mug->forceFill(['price_centavos' => 48000])->save();

        $this->getJson('/api/v1/cart')
            ->assertJsonPath('data.can_checkout', false)
            ->assertJsonPath('data.groups.0.items.0.title', 'Stoneware mug, oat')
            ->assertJsonPath('data.groups.0.items.0.issue', 'price_changed')
            ->assertJsonPath('data.groups.0.items.0.previous_unit_price_centavos', 45000);

        $this->checkout('attempt-0007', $version)->assertStatus(409)->assertJsonPath('code', 'cart_changed');

        $version = $this->putJson("/api/v1/cart/items/{$mug->id}", ['quantity' => 2])
            ->assertJsonPath('data.can_checkout', true)
            ->assertJsonPath('data.total_centavos', 223000)
            ->json('data.version');
        $this->checkout('attempt-0008', $version)->assertCreated()->assertJsonPath('data.purchase.total_centavos', 223000);
    }

    public function test_two_buyers_competing_for_the_last_item_get_one_allocation(): void
    {
        // ponytail: sequential race. True concurrency (TC-04) needs PostgreSQL row locks and two connections.
        $vase = $this->product('KL-006');
        Inventory::where('product_id', $vase->id)->update(['available_quantity' => 1]);
        User::forceCreate(['name' => 'Sam Lee', 'email' => 'sam@demo.test', 'password' => 'demo-password', 'role' => 'buyer']);

        $alexVersion = $this->buyer()->putJson("/api/v1/cart/items/{$vase->id}", ['quantity' => 1])->json('data.version');
        $samVersion = $this->buyer('sam@demo.test')->putJson("/api/v1/cart/items/{$vase->id}", ['quantity' => 1])->json('data.version');

        $this->checkout('attempt-0009', $samVersion)->assertCreated();
        $this->buyer()->checkout('attempt-0010', $alexVersion)
            ->assertStatus(409)
            ->assertJsonPath('code', 'insufficient_stock')
            ->assertJsonPath('data.groups.0.items.0.issue', 'insufficient_stock');

        $this->assertSame(0, $this->stock('KL-006'));
        $this->assertSame(1, Purchase::count());
    }

    public function test_order_lines_keep_their_snapshot_after_catalog_edits(): void
    {
        $id = $this->checkout('attempt-0011', $this->buyer()->fillCanonicalCart())->json('data.purchase.id');
        $this->product('KL-001')->forceFill(['title' => 'Renamed mug', 'price_centavos' => 99900])->save();

        $this->getJson("/api/v1/purchases/$id")
            ->assertJsonPath('data.seller_orders.0.items.0.title', 'Stoneware mug, oat')
            ->assertJsonPath('data.seller_orders.0.items.0.unit_price_centavos', 45000)
            ->assertJsonPath('data.seller_orders.0.items.1.title', 'Cotton hand towel');
    }

    public function test_purchases_and_cart_are_buyer_only_and_owner_scoped(): void
    {
        $id = $this->checkout('attempt-0012', $this->buyer()->fillCanonicalCart())->json('data.purchase.id');
        User::forceCreate(['name' => 'Sam Lee', 'email' => 'sam@demo.test', 'password' => 'demo-password', 'role' => 'buyer']);

        $this->buyer('sam@demo.test')->getJson("/api/v1/purchases/$id")->assertNotFound();
        $this->buyer('sam@demo.test')->getJson('/api/v1/checkout-attempts/attempt-0012')->assertNotFound();
        $this->buyer('mara@demo.test')->getJson('/api/v1/cart')->assertForbidden();
        $this->buyer('admin@demo.test')->getJson("/api/v1/purchases/$id")->assertForbidden();
    }

    public function test_checkout_validates_key_and_address(): void
    {
        $version = $this->buyer()->fillCanonicalCart();

        $this->checkout('short', $version)->assertStatus(422)->assertJsonValidationErrors('idempotency_key');
        $this->checkout('attempt-0013', $version, 'success', ['postcode' => 'ABC'] + self::ADDRESS)
            ->assertStatus(422)
            ->assertJsonValidationErrors('address.postcode');
        $this->checkout('attempt-0014', $version, 'maybe')->assertStatus(422)->assertJsonValidationErrors('demo_outcome');
        $this->assertSame(0, Purchase::count());
    }

    public function test_public_catalog_filters_sort_and_detail_limits(): void
    {
        $kubo = $this->product('KL-001')->seller_id;

        $this->getJson("/api/v1/products?seller=$kubo")->assertJsonPath('meta.total', 6)->assertJsonCount(2, 'meta.sellers');
        $this->getJson('/api/v1/products?min_price=30000&max_price=90000&category=home')->assertJsonPath('meta.total', 4);
        $this->getJson('/api/v1/products?sort=price_desc')->assertJsonPath('data.0.title', 'Enamel coffee pot');
        $this->getJson('/api/v1/products/glass-bud-vase')
            ->assertJsonPath('data.max_quantity', 4)
            ->assertJsonPath('data.delivery_centavos', 8000);
        $this->getJson('/api/v1/products?sort=random')->assertStatus(422);
    }
}
