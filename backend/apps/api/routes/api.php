<?php

use App\Modules\Catalog\Http\ModerationController;
use App\Modules\Catalog\Http\ProductController;
use App\Modules\Catalog\Http\SellerProductController;
use App\Modules\Checkout\Http\CartController;
use App\Modules\Checkout\Http\CheckoutAttemptController;
use App\Modules\Orders\Http\AdminPurchaseController;
use App\Modules\Orders\Http\CancelOrderController;
use App\Modules\Orders\Http\PurchaseController;
use App\Modules\Orders\Http\SellerOrderController;
use App\Modules\Sellers\Http\SellerApplicationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::middleware('throttle:search')->group(function () {
        Route::get('products', [ProductController::class, 'index']);
        Route::get('products/{slug}', [ProductController::class, 'show']);
    });

    Route::middleware(['auth:sanctum', 'can:shop'])->group(function () {
        Route::get('cart', [CartController::class, 'show']);
        Route::put('cart/items/{productId}', [CartController::class, 'put']);
        Route::delete('cart/items/{productId}', [CartController::class, 'destroy']);
        Route::post('checkout-attempts', [CheckoutAttemptController::class, 'store'])->middleware('throttle:checkout');
        Route::get('checkout-attempts/{key}', [CheckoutAttemptController::class, 'show']);
        Route::get('purchases', [PurchaseController::class, 'index']);
        Route::get('purchases/{id}', [PurchaseController::class, 'show']);
    });

    // Owning buyer or owning seller; the controller resolves which.
    Route::middleware('auth:sanctum')->post('seller-orders/{id}/cancel', CancelOrderController::class);

    Route::middleware(['auth:sanctum', 'can:act-as-seller'])->prefix('seller')->group(function () {
        Route::get('products', [SellerProductController::class, 'index']);
        Route::post('products', [SellerProductController::class, 'store']);
        Route::get('products/{id}', [SellerProductController::class, 'show']);
        Route::patch('products/{id}', [SellerProductController::class, 'update']);
        Route::patch('products/{id}/inventory', [SellerProductController::class, 'inventory']);
        Route::post('products/{id}/publish', [SellerProductController::class, 'publish']);
        Route::post('products/{id}/unpublish', [SellerProductController::class, 'unpublish']);

        Route::get('orders', [SellerOrderController::class, 'index']);
        Route::get('orders/{id}', [SellerOrderController::class, 'show']);
        Route::post('orders/{id}/transitions', [SellerOrderController::class, 'transition']);
    });

    Route::middleware(['auth:sanctum', 'can:administer'])->prefix('admin')->group(function () {
        Route::get('seller-applications', [SellerApplicationController::class, 'index']);
        Route::get('seller-applications/{id}', [SellerApplicationController::class, 'show']);
        Route::post('seller-applications/{id}/decision', [SellerApplicationController::class, 'decide']);

        Route::get('products', [ModerationController::class, 'index']);
        Route::post('products/{id}/moderation', [ModerationController::class, 'moderate']);

        Route::get('purchases', [AdminPurchaseController::class, 'index']);
        Route::get('purchases/{id}', [AdminPurchaseController::class, 'show']);
    });
});
