<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** TC-06 / TC-07: seller product drafts, edits, publishing and stock (AC-13..AC-15). */
class SellerCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private const NEW_PRODUCT = [
        'title' => 'Rattan coaster set',
        'category' => 'home',
        'description' => 'Four hand-woven rattan coasters.',
        'price_centavos' => 26000,
        'material' => 'Rattan',
        'available_quantity' => 15,
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::where('email', 'mara@demo.test')->sole());
    }

    private function product(string $sku): Product
    {
        return Product::where('sku', $sku)->sole();
    }

    public function test_new_product_starts_as_a_hidden_draft_until_published(): void
    {
        $created = $this->postJson('/api/v1/seller/products', self::NEW_PRODUCT)
            ->assertCreated()
            ->assertJsonPath('data.sku', 'KL-007')
            ->assertJsonPath('data.visibility', 'draft')
            ->assertJsonPath('data.available_quantity', 15)
            ->json('data');

        $this->getJson('/api/v1/products/rattan-coaster-set')->assertNotFound();

        $this->postJson("/api/v1/seller/products/{$created['id']}/publish", ['expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.visibility', 'published');
        $this->getJson('/api/v1/products/rattan-coaster-set')->assertOk()->assertJsonPath('data.seller.name', 'Kubo Living');

        $this->postJson("/api/v1/seller/products/{$created['id']}/unpublish", ['expected_version' => 2])->assertJsonPath('data.visibility', 'draft');
        $this->getJson('/api/v1/products/rattan-coaster-set')->assertNotFound();
    }

    public function test_required_fields_have_labelled_errors(): void
    {
        $this->postJson('/api/v1/seller/products', ['title' => 'x', 'price_centavos' => -5, 'image_url' => 'javascript:alert(1)'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'category', 'description', 'price_centavos', 'image_url']);
    }

    public function test_stale_edit_is_rejected_with_the_current_record(): void
    {
        $mug = $this->product('KL-001');
        $this->patchJson("/api/v1/seller/products/{$mug->id}", ['price_centavos' => 47000, 'expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.version', 2);

        $this->patchJson("/api/v1/seller/products/{$mug->id}", ['title' => 'Old tab edit', 'expected_version' => 1])
            ->assertStatus(409)
            ->assertJsonPath('code', 'stale_version')
            ->assertJsonPath('data.price_centavos', 47000)
            ->assertJsonPath('data.version', 2);
        $this->assertSame('Stoneware mug, oat', $mug->fresh()->title);
    }

    public function test_stock_cannot_go_negative_or_use_a_stale_version(): void
    {
        $mug = $this->product('KL-001');
        $this->patchJson("/api/v1/seller/products/{$mug->id}/inventory", ['available_quantity' => -1, 'expected_version' => 1])
            ->assertStatus(422)
            ->assertJsonValidationErrors('available_quantity');

        $this->patchJson("/api/v1/seller/products/{$mug->id}/inventory", ['available_quantity' => 20, 'expected_version' => 1])
            ->assertOk()
            ->assertJsonPath('data.available_quantity', 20)
            ->assertJsonPath('data.inventory_version', 2);
        $this->patchJson("/api/v1/seller/products/{$mug->id}/inventory", ['available_quantity' => 5, 'expected_version' => 1])
            ->assertStatus(409)
            ->assertJsonPath('code', 'stale_version')
            ->assertJsonPath('data.available_quantity', 20);

        $this->assertDatabaseHas('audit_events', ['action' => 'inventory.updated', 'entity_id' => $mug->id]);
    }

    public function test_moderated_listing_cannot_be_republished_by_the_seller(): void
    {
        $mug = $this->product('KL-001');
        $mug->forceFill(['visibility' => 'moderated', 'moderation_reason' => 'Photo shows a different item.'])->save();

        $this->postJson("/api/v1/seller/products/{$mug->id}/publish", ['expected_version' => 1])
            ->assertStatus(409)
            ->assertJsonPath('code', 'moderation_hold');
        $this->assertSame('moderated', $mug->fresh()->visibility->value);
    }

    public function test_another_sellers_products_are_not_found(): void
    {
        $tray = $this->product('DO-001');
        $this->getJson("/api/v1/seller/products/{$tray->id}")->assertNotFound();
        $this->patchJson("/api/v1/seller/products/{$tray->id}", ['title' => 'Hijacked', 'expected_version' => 1])->assertNotFound();
        $this->patchJson("/api/v1/seller/products/{$tray->id}/inventory", ['available_quantity' => 0, 'expected_version' => 1])->assertNotFound();
        $this->postJson("/api/v1/seller/products/{$tray->id}/unpublish", ['expected_version' => 1])->assertNotFound();
        $this->assertSame('Desk tray, walnut', $tray->fresh()->title);
        $this->assertSame(0, DB::table('audit_events')->count());
    }

    public function test_product_list_search_and_visibility_filter(): void
    {
        $this->getJson('/api/v1/seller/products?q=kl-00')->assertJsonPath('meta.total', 6);
        $this->getJson('/api/v1/seller/products?q=vase')->assertJsonPath('data.0.sku', 'KL-006');
        $this->actingAs(User::where('email', 'ben@demo.test')->sole())
            ->getJson('/api/v1/seller/products?visibility=draft')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.sku', 'DO-006');
    }
}
