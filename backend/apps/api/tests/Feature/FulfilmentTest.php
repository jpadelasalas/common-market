<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Inventory;
use App\Modules\Catalog\Models\Product;
use App\Modules\Orders\Models\DemoAdjustment;
use App\Modules\Orders\Models\SellerOrder;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** TC-05 / TC-07 / TC-08: seller fulfilment, buyer tracking and cancellation (Phase 4). */
class FulfilmentTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private string $kubo;    // Kubo Living's order in CM-1001

    private string $daily;   // Daily Objects' order in CM-1001

    private string $purchase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->as('alex@demo.test');
        foreach (['KL-001' => 2, 'KL-002' => 1, 'DO-001' => 1] as $sku => $q) {
            $version = $this->putJson('/api/v1/cart/items/'.$this->product($sku)->id, ['quantity' => $q])->json('data.version');
        }
        $purchase = $this->withHeader('Idempotency-Key', 'fulfil-0001')->postJson('/api/v1/checkout-attempts', [
            'cart_version' => $version,
            'address' => ['recipient_name' => 'Alex Rivera', 'address_line' => '24 Sample Lane', 'city' => 'Quezon City', 'postcode' => '1100'],
            'demo_outcome' => 'success',
        ])->assertCreated()->json('data.purchase');

        $this->purchase = $purchase['id'];
        [$this->kubo, $this->daily] = array_column($purchase['seller_orders'], 'id');
    }

    private function as(string $email): static
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

    private function step(string $order, string $to, int $version, string $seller = 'mara@demo.test')
    {
        return $this->as($seller)->postJson("/api/v1/seller/orders/$order/transitions", ['to' => $to, 'expected_version' => $version]);
    }

    public function test_seller_moves_an_order_through_fulfilment_and_buyer_tracking_follows(): void
    {
        $this->step($this->kubo, 'processing', 1)->assertOk()->assertJsonPath('data.status', 'processing')->assertJsonPath('data.version', 2);
        $this->step($this->kubo, 'shipped', 2)->assertOk()->assertJsonPath('data.status', 'shipped')->assertJsonPath('data.cancellable', false);
        $this->step($this->kubo, 'delivered', 3)->assertOk()->assertJsonPath('data.status', 'delivered');

        $this->as('alex@demo.test')->getJson("/api/v1/purchases/{$this->purchase}")
            ->assertJsonPath('data.seller_orders.0.status', 'delivered')
            ->assertJsonPath('data.seller_orders.0.events.*.to_status', ['placed', 'processing', 'shipped', 'delivered'])
            ->assertJsonPath('data.seller_orders.0.events.1.actor', 'seller')
            ->assertJsonPath('data.seller_orders.1.status', 'placed')
            ->assertJsonPath('data.fulfilment', 'in_progress');

        $this->assertSame(3, DB::table('audit_events')->where('entity_id', $this->kubo)->count());
    }

    public function test_invalid_stale_and_duplicate_transitions(): void
    {
        // Skipping a step and going backwards are both rejected without writes.
        $this->step($this->kubo, 'shipped', 1)->assertStatus(409)->assertJsonPath('code', 'invalid_transition');
        $this->step($this->kubo, 'processing', 7)->assertStatus(409)->assertJsonPath('code', 'stale_version');
        $this->step($this->kubo, 'processing', 1)->assertOk();
        // Duplicate submit of the step already reached is a safe replay.
        $this->step($this->kubo, 'processing', 1)->assertOk()->assertJsonPath('data.version', 2);
        $this->assertSame(2, SellerOrder::find($this->kubo)->events()->count());
        $this->step($this->kubo, 'cancelled', 2)->assertStatus(422);
    }

    public function test_seller_cannot_see_or_change_another_sellers_order(): void
    {
        $this->as('mara@demo.test')->getJson("/api/v1/seller/orders/{$this->daily}")->assertNotFound();
        $this->step($this->daily, 'processing', 1)->assertNotFound();
        $this->as('mara@demo.test')->postJson("/api/v1/seller-orders/{$this->daily}/cancel", ['expected_version' => 1])->assertNotFound();
        $this->as('mara@demo.test')->getJson('/api/v1/seller/orders')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.reference', 'KL-1001');
        $this->as('alex@demo.test')->getJson('/api/v1/seller/orders')->assertForbidden();
    }

    public function test_seller_order_view_includes_buyer_delivery_snapshot(): void
    {
        $this->as('mara@demo.test')->getJson("/api/v1/seller/orders/{$this->kubo}")
            ->assertOk()
            ->assertJsonPath('data.buyer_name', 'Alex Rivera')
            ->assertJsonPath('data.address.city', 'Quezon City')
            ->assertJsonPath('data.total_centavos', 130000)
            ->assertJsonCount(2, 'data.items');
        $this->as('mara@demo.test')->getJson('/api/v1/seller/orders?status=placed&q=alex')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.counts.placed', 1);
    }

    public function test_buyer_cancels_before_shipment_once_with_stock_and_refund_restored(): void
    {
        $this->assertSame(10, $this->stock('KL-001'));

        $this->as('alex@demo.test')->postJson("/api/v1/seller-orders/{$this->kubo}/cancel", ['expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancelled_by', 'buyer');
        // Repeat returns the existing result and restores nothing twice.
        $this->postJson("/api/v1/seller-orders/{$this->kubo}/cancel", ['expected_version' => 1])->assertOk();

        $this->assertSame(12, $this->stock('KL-001'));
        $this->assertSame(9, $this->stock('KL-002'));
        $this->assertSame(1, DemoAdjustment::count());
        $this->assertSame(130000, DemoAdjustment::sole()->amount_centavos);

        $this->getJson("/api/v1/purchases/{$this->purchase}")
            ->assertJsonPath('data.payment.status', 'partially_refunded')
            ->assertJsonPath('data.seller_orders.1.status', 'placed')
            ->assertJsonPath('data.fulfilment', 'in_progress');

        $this->as('ben@demo.test')->postJson("/api/v1/seller-orders/{$this->daily}/cancel", ['expected_version' => 1, 'reason' => 'Out of walnut trays.'])
            ->assertOk()
            ->assertJsonPath('data.cancelled_by', 'seller');
        $this->as('alex@demo.test')->getJson("/api/v1/purchases/{$this->purchase}")
            ->assertJsonPath('data.payment.status', 'refunded')
            ->assertJsonPath('data.fulfilment', 'cancelled')
            ->assertJsonPath('data.seller_orders.1.cancel_reason', 'Out of walnut trays.');
    }

    public function test_shipped_orders_cannot_be_cancelled_and_cancelled_orders_cannot_ship(): void
    {
        $this->step($this->kubo, 'processing', 1);
        $this->step($this->kubo, 'shipped', 2);
        $this->as('alex@demo.test')->postJson("/api/v1/seller-orders/{$this->kubo}/cancel", ['expected_version' => 3])
            ->assertStatus(409)
            ->assertJsonPath('code', 'cancellation_not_allowed');
        $this->assertSame(10, $this->stock('KL-001'));

        // Race: buyer cancels first, the seller's shipment with the old version then loses.
        $this->as('alex@demo.test')->postJson("/api/v1/seller-orders/{$this->daily}/cancel", ['expected_version' => 1])->assertOk();
        $this->step($this->daily, 'processing', 1, 'ben@demo.test')->assertStatus(409)->assertJsonPath('code', 'invalid_transition');
    }

    public function test_other_buyers_cannot_cancel(): void
    {
        User::forceCreate(['name' => 'Sam Lee', 'email' => 'sam@demo.test', 'password' => 'demo-password', 'role' => 'buyer']);
        $this->as('sam@demo.test')->postJson("/api/v1/seller-orders/{$this->kubo}/cancel", ['expected_version' => 1])->assertNotFound();
        $this->as('admin@demo.test')->postJson("/api/v1/seller-orders/{$this->kubo}/cancel", ['expected_version' => 1])->assertNotFound();
        $this->assertSame('placed', SellerOrder::find($this->kubo)->status->value);
    }
}
