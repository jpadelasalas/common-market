<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use App\Modules\Sellers\Models\SellerApplication;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** TC-09: admin approval, moderation and read-only oversight (AC-18..AC-20). */
class AdministrationTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private function as(string $email): static
    {
        return $this->actingAs(User::where('email', $email)->sole());
    }

    private function application(string $shop): SellerApplication
    {
        return SellerApplication::whereHas('seller', fn ($q) => $q->where('name', $shop))->sole();
    }

    public function test_admin_approves_an_application_and_the_shop_gains_the_workspace(): void
    {
        $sari = $this->application('Sari Studio');
        $this->as('lia@demo.test')->getJson('/api/v1/seller/products')->assertForbidden();

        $this->as('admin@demo.test')->getJson("/api/v1/admin/seller-applications/{$sari->id}")
            ->assertOk()
            ->assertJsonPath('data.reference', 'APP-003')
            ->assertJsonPath('data.contact_email', 'sari-studio@example.test');
        $this->postJson("/api/v1/admin/seller-applications/{$sari->id}/decision", ['decision' => 'approve', 'expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.state', 'approved')
            ->assertJsonPath('data.reviewer', 'Admin Demo')
            ->assertJsonPath('data.history.0.action', 'seller_application.approved')
            ->assertJsonPath('data.history.0.actor', 'Admin Demo');

        $this->as('lia@demo.test')->getJson('/api/v1/seller/products')->assertOk();
        // Decisions are final in v1.
        $this->as('admin@demo.test')->postJson("/api/v1/admin/seller-applications/{$sari->id}/decision", ['decision' => 'reject', 'reason' => 'Changed mind', 'expected_version' => 2])
            ->assertStatus(409)
            ->assertJsonPath('code', 'already_decided');
    }

    public function test_rejection_requires_a_reason_and_records_it(): void
    {
        $habi = $this->application('Habi Home');
        $this->as('admin@demo.test')->postJson("/api/v1/admin/seller-applications/{$habi->id}/decision", ['decision' => 'reject', 'expected_version' => 1])
            ->assertStatus(422)
            ->assertJsonPath('errors.reason.0', 'Give a reason the applicant can understand.');

        $this->postJson("/api/v1/admin/seller-applications/{$habi->id}/decision", ['decision' => 'reject', 'reason' => 'Product photos are missing.', 'expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.state', 'rejected')
            ->assertJsonPath('data.review_reason', 'Product photos are missing.')
            ->assertJsonPath('data.history.0.reason', 'Product photos are missing.');
        $this->assertSame('rejected', $habi->seller->fresh()->status->value);
        $this->getJson('/api/v1/admin/seller-applications')->assertJsonPath('meta.total', 1)->assertJsonPath('meta.counts.rejected', 1);
    }

    public function test_stale_decisions_and_non_admins_are_refused(): void
    {
        $sari = $this->application('Sari Studio');
        $this->as('admin@demo.test')->postJson("/api/v1/admin/seller-applications/{$sari->id}/decision", ['decision' => 'approve', 'expected_version' => 9])
            ->assertStatus(409)
            ->assertJsonPath('code', 'stale_version');
        foreach (['alex@demo.test', 'mara@demo.test', 'lia@demo.test'] as $email) {
            $this->as($email)->postJson("/api/v1/admin/seller-applications/{$sari->id}/decision", ['decision' => 'approve', 'expected_version' => 1])->assertForbidden();
        }
        $this->assertSame('pending', $sari->fresh()->state->value);
        $this->assertSame(0, DB::table('audit_events')->count());
    }

    public function test_moderation_hides_a_listing_but_keeps_order_history_until_cleared(): void
    {
        // A purchase that includes the mug, so we can prove its snapshot survives moderation.
        $mug = Product::where('sku', 'KL-001')->sole();
        $this->as('alex@demo.test')->putJson("/api/v1/cart/items/{$mug->id}", ['quantity' => 1]);
        $purchase = $this->withHeader('Idempotency-Key', 'moderation-0001')->postJson('/api/v1/checkout-attempts', [
            'cart_version' => 2,
            'address' => ['recipient_name' => 'Alex Rivera', 'address_line' => '24 Sample Lane', 'city' => 'Quezon City', 'postcode' => '1100'],
            'demo_outcome' => 'success',
        ])->assertCreated()->json('data.purchase.id');

        $this->as('admin@demo.test')->postJson("/api/v1/admin/products/{$mug->id}/moderation", ['action' => 'unpublish', 'expected_version' => 1])
            ->assertStatus(422)
            ->assertJsonPath('errors.reason.0', 'Moderation needs a reason the seller can act on.');
        $this->postJson("/api/v1/admin/products/{$mug->id}/moderation", ['action' => 'unpublish', 'reason' => 'Photo shows a different item.', 'expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.visibility', 'moderated')
            ->assertJsonPath('data.moderation_reason', 'Photo shows a different item.');

        $this->getJson('/api/v1/products/stoneware-mug-oat')->assertNotFound();
        $this->as('alex@demo.test')->getJson("/api/v1/purchases/$purchase")->assertJsonPath('data.seller_orders.0.items.0.title', 'Stoneware mug, oat');
        // The seller sees why and cannot republish without clearance.
        $this->as('mara@demo.test')->getJson("/api/v1/seller/products/{$mug->id}")->assertJsonPath('data.moderation_reason', 'Photo shows a different item.');
        $this->postJson("/api/v1/seller/products/{$mug->id}/publish", ['expected_version' => 2])->assertStatus(409)->assertJsonPath('code', 'moderation_hold');

        $this->as('admin@demo.test')->postJson("/api/v1/admin/products/{$mug->id}/moderation", ['action' => 'clear', 'reason' => 'Seller replaced the photo.', 'expected_version' => 2])
            ->assertOk()
            ->assertJsonPath('data.visibility', 'draft');
        $this->as('mara@demo.test')->postJson("/api/v1/seller/products/{$mug->id}/publish", ['expected_version' => 3])->assertOk();
        $this->assertSame(['product.moderated', 'product.moderation_cleared', 'product.published'],
            DB::table('audit_events')->where('entity_id', $mug->id)->orderBy('created_at')->orderBy('id')->pluck('action')->all());
    }

    public function test_only_published_listings_can_be_moderated_and_sellers_cannot_moderate(): void
    {
        $draft = Product::where('sku', 'DO-006')->sole();
        $this->as('admin@demo.test')->postJson("/api/v1/admin/products/{$draft->id}/moderation", ['action' => 'unpublish', 'reason' => 'Not allowed here.', 'expected_version' => 1])
            ->assertStatus(409)
            ->assertJsonPath('code', 'invalid_transition');
        $this->as('mara@demo.test')->getJson('/api/v1/admin/products')->assertForbidden();
        $this->as('admin@demo.test')->getJson('/api/v1/admin/products?q=kubo')->assertJsonPath('meta.total', 6);
    }

    public function test_order_oversight_is_read_only_and_keeps_payment_separate(): void
    {
        $mug = Product::where('sku', 'KL-001')->sole();
        $this->as('alex@demo.test')->putJson("/api/v1/cart/items/{$mug->id}", ['quantity' => 1]);
        $purchase = $this->withHeader('Idempotency-Key', 'oversight-0001')->postJson('/api/v1/checkout-attempts', [
            'cart_version' => 2,
            'address' => ['recipient_name' => 'Alex Rivera', 'address_line' => '24 Sample Lane', 'city' => 'Quezon City', 'postcode' => '1100'],
            'demo_outcome' => 'success',
        ])->json('data.purchase');
        $order = $purchase['seller_orders'][0]['id'];

        $this->as('admin@demo.test')->getJson('/api/v1/admin/purchases?q=alex')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.payment_status', 'succeeded')
            ->assertJsonPath('data.0.fulfilment', 'placed');
        $this->getJson("/api/v1/admin/purchases/{$purchase['id']}")
            ->assertJsonPath('data.address.city', 'Quezon City')
            ->assertJsonPath('data.seller_orders.0.status', 'placed');

        // No shortcuts: admin cannot drive fulfilment or cancel.
        $this->postJson("/api/v1/seller/orders/$order/transitions", ['to' => 'processing', 'expected_version' => 1])->assertForbidden();
        $this->postJson("/api/v1/seller-orders/$order/cancel", ['expected_version' => 1])->assertNotFound();
        $this->as('alex@demo.test')->getJson('/api/v1/admin/purchases')->assertForbidden();
    }
}
