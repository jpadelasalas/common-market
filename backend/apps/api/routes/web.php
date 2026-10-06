<?php

use App\Modules\Identity\Http\SessionController;
use Illuminate\Support\Facades\Route;

// API-11 session endpoints. Under /auth so they never collide with SPA routes the shell proxies.
Route::prefix('auth')->group(function () {
    Route::get('session', [SessionController::class, 'show']);
    Route::post('login', [SessionController::class, 'login'])->middleware('throttle:login');
    Route::post('logout', [SessionController::class, 'logout']);
});
