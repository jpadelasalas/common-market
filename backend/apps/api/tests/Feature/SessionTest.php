<?php

namespace Tests\Feature;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\CatalogSeeder;
use Tests\TestCase;

/** TC-11 (backend part): cookie session, logout, CSRF, throttling, no account enumeration. */
class SessionTest extends TestCase
{
    use RefreshDatabase;

    protected $seed = true;

    protected $seeder = CatalogSeeder::class;

    private const ALEX = ['email' => 'alex@demo.test', 'password' => 'demo-password'];

    public function test_login_returns_session_without_secrets_and_logout_ends_it(): void
    {
        $this->postJson('/auth/login', self::ALEX)
            ->assertOk()
            ->assertJsonPath('data.name', 'Alex Rivera')
            ->assertJsonPath('data.role', 'buyer')
            ->assertJsonPath('data.seller', null)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.email');

        $this->getJson('/auth/session')->assertJsonPath('data.role', 'buyer');

        $this->postJson('/auth/logout')->assertNoContent();
        $this->getJson('/auth/session')->assertExactJson(['data' => null]);
    }

    public function test_seller_session_includes_shop_status(): void
    {
        $this->postJson('/auth/login', ['email' => 'lia@demo.test', 'password' => 'demo-password'])
            ->assertJsonPath('data.role', 'seller')
            ->assertJsonPath('data.seller.name', 'Sari Studio')
            ->assertJsonPath('data.seller.status', 'pending');
    }

    public function test_bad_credentials_do_not_reveal_whether_the_account_exists(): void
    {
        $known = $this->postJson('/auth/login', ['email' => 'alex@demo.test', 'password' => 'wrong'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'validation_failed')
            ->json('errors');
        $unknown = $this->postJson('/auth/login', ['email' => 'nobody@demo.test', 'password' => 'wrong'])
            ->assertStatus(422)
            ->json('errors');

        $this->assertSame($known, $unknown);
    }

    public function test_login_is_throttled_after_five_attempts_per_account_and_ip(): void
    {
        $wrong = ['email' => 'alex@demo.test', 'password' => 'wrong'];
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/auth/login', $wrong)->assertStatus(422);
        }

        $this->postJson('/auth/login', $wrong)
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('code', 'too_many_requests');
    }

    public function test_login_requires_a_csrf_token(): void
    {
        // Laravel skips CSRF under unit tests; restore the real check for this test.
        $this->app->instance(PreventRequestForgery::class, new class($this->app, $this->app['encrypter']) extends PreventRequestForgery
        {
            protected function runningUnitTests()
            {
                return false;
            }
        });

        $this->postJson('/auth/login', self::ALEX)
            ->assertStatus(419)
            ->assertJsonPath('code', 'csrf_token_mismatch');

        $this->withSession(['_token' => 'test-token'])
            ->postJson('/auth/login', self::ALEX + ['_token' => 'test-token'])
            ->assertOk();
    }

    public function test_session_cookie_authenticates_api_requests_from_the_shell_origin(): void
    {
        $this->postJson('/auth/login', ['email' => 'mara@demo.test', 'password' => 'demo-password'])->assertOk();

        $this->withHeader('Origin', 'http://localhost:5000')
            ->getJson('/api/v1/seller/products')
            ->assertOk()
            ->assertJsonPath('meta.total', 6);
    }
}
