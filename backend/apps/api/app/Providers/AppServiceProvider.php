<?php

namespace App\Providers;

use App\Models\User;
use App\Modules\Identity\Role;
use App\Modules\Sellers\ReviewState;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Mass assignment, lazy loading and missing attributes fail loudly outside production.
        Model::shouldBeStrict(! $this->app->isProduction());

        // Role capabilities (security matrix). Ownership is enforced by query scoping in each module.
        Gate::define('act-as-seller', fn (User $user) => $user->role === Role::Seller
            && $user->seller?->status === ReviewState::Approved);
        Gate::define('administer', fn (User $user) => $user->role === Role::Admin);
        Gate::define('shop', fn (User $user) => $user->role === Role::Buyer);

        // Proposed throttles (security matrix); numbers are not production sizing.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));
        RateLimiter::for('search', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()));
    }
}
