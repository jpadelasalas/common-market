<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\CatalogSeeder;
use Tests\TestCase;

/** TC-07 / TC-12 (foundation): role gates, seller ownership, public scope, error contract. */
class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private function as(string $email): static
    {
        return $this->actingAs(User::where('email', $email)->sole());
    }

    private function productId(string $sku): string
    {
        return Product::where('sku', $sku)->sole()->id;
    }

    public function test_guests_get_401_on_seller_and_admin_routes(): void
    {
        $this->getJson('/api/v1/seller/products')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
        $this->getJson('/api/v1/admin/seller-applications')->assertUnauthorized();
    }

    public function test_roles_cannot_cross_into_other_workspaces(): void
    {
        $this->as('alex@demo.test')->getJson('/api/v1/seller/products')->assertForbidden()->assertJsonPath('code', 'forbidden');
        $this->as('alex@demo.test')->getJson('/api/v1/admin/seller-applications')->assertForbidden();
        $this->as('mara@demo.test')->getJson('/api/v1/admin/seller-applications')->assertForbidden();
        // Admin oversight does not include acting as a seller (security matrix).
        $this->as('admin@demo.test')->getJson('/api/v1/seller/products')->assertForbidden();
    }

    public function test_pending_seller_cannot_use_the_seller_workspace(): void
    {
        $this->as('lia@demo.test')->getJson('/api/v1/seller/products')->assertForbidden();
    }

    public function test_seller_sees_only_own_products(): void
    {
        $skus = $this->as('mara@demo.test')->getJson('/api/v1/seller/products')
            ->assertOk()
            ->assertJsonPath('meta.total', 6)
            ->json('data.*.sku');

        $this->assertSame(['KL-001', 'KL-002', 'KL-003', 'KL-004', 'KL-005', 'KL-006'], $skus);
    }

    public function test_seller_cannot_read_another_sellers_product_by_direct_id(): void
    {
        $this->as('mara@demo.test')->getJson('/api/v1/seller/products/'.$this->productId('KL-001'))
            ->assertOk()
            ->assertJsonPath('data.available_quantity', 12);

        // Daily Objects' product: 404, so the ID's existence is not revealed.
        $this->as('mara@demo.test')->getJson('/api/v1/seller/products/'.$this->productId('DO-001'))
            ->assertNotFound()
            ->assertJsonPath('code', 'not_found');
    }

    public function test_admin_sees_pending_applications(): void
    {
        $this->as('admin@demo.test')->getJson('/api/v1/admin/seller-applications')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.*.shop.name', ['Sari Studio', 'Habi Home']);
    }

    public function test_public_catalog_hides_drafts_and_internal_fields(): void
    {
        $response = $this->getJson('/api/v1/products?per_page=100')->assertOk()->assertJsonPath('meta.total', 11);

        $this->assertNotContains('recycled-paper-notebook', $response->json('data.*.slug'));
        $this->assertArrayNotHasKey('available_quantity', $response->json('data.0'));
        $this->assertArrayNotHasKey('sku', $response->json('data.0'));

        $this->getJson('/api/v1/products/recycled-paper-notebook')->assertNotFound();
        $this->getJson('/api/v1/products/stoneware-mug-oat')
            ->assertOk()
            ->assertJsonPath('data.price_centavos', 45000)
            ->assertJsonPath('data.currency', 'PHP')
            ->assertJsonPath('data.seller.name', 'Kubo Living');
    }

    public function test_catalog_search_category_and_page_limits(): void
    {
        $this->getJson('/api/v1/products?q=MUG')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/products?category=kitchen')->assertJsonPath('meta.total', 4);
        $this->getJson('/api/v1/products')->assertJsonPath('meta.per_page', 24);
        $this->getJson('/api/v1/products?per_page=101')->assertStatus(422)->assertJsonValidationErrors('per_page');
        $this->getJson('/api/v1/products?category=garden')->assertStatus(422);
    }

    public function test_errors_carry_the_request_id(): void
    {
        $this->withHeader('X-Request-Id', 'demo-request-0001')
            ->getJson('/api/v1/products/missing')
            ->assertNotFound()
            ->assertHeader('X-Request-Id', 'demo-request-0001')
            ->assertJsonPath('request_id', 'demo-request-0001');

        // Malformed IDs are replaced, not echoed.
        $id = $this->withHeader('X-Request-Id', '<script>')->getJson('/api/v1/products')->headers->get('X-Request-Id');
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $id);
    }
}
