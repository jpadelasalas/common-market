<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Hosted container start (docker/start.sh) and production response headers. */
class DeploymentTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    /** Every container restart runs demo:seed-if-empty; it must never reseed or duplicate live data. */
    public function test_restarts_never_reseed_an_existing_database(): void
    {
        [$users, $products] = [User::count(), Product::count()];

        $this->artisan('demo:seed-if-empty')->expectsOutputToContain('skipping seed')->assertSuccessful();

        $this->assertSame($users, User::count());
        $this->assertSame($products, Product::count());
    }

    public function test_api_responses_carry_security_headers(): void
    {
        $this->getJson('/api/v1/products')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }
}
