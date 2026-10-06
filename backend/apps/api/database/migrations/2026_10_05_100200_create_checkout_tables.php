<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// DB-05..DB-09 (checkout part): cart, idempotent attempts, purchase with one order per seller,
// immutable item snapshots, order events and the simulated payment.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('buyer_user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            // Price the buyer last saw; a different current price must be reviewed (AC-05).
            $table->unsignedInteger('unit_price_centavos');
            $table->timestamps();
            $table->unique(['cart_id', 'product_id']);
        });

        Schema::create('purchases', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->unsignedInteger('number')->unique();
            $table->foreignUlid('buyer_user_id')->constrained('users')->restrictOnDelete();
            $table->string('recipient_name');
            $table->string('address_line');
            $table->string('city');
            $table->string('postcode', 16);
            $table->string('delivery_note')->nullable();
            $table->unsignedInteger('items_centavos');
            $table->unsignedInteger('delivery_centavos');
            $table->unsignedInteger('total_centavos');
            $table->char('currency', 3)->default('PHP');
            $table->timestamps();
            $table->index(['buyer_user_id', 'created_at']);
        });

        Schema::create('checkout_attempts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('buyer_user_id')->constrained('users')->restrictOnDelete();
            $table->string('idempotency_key', 64);
            $table->char('request_hash', 64);
            $table->string('state', 16)->default('pending');
            $table->foreignUlid('purchase_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('failure_code', 32)->nullable();
            $table->timestamps();
            $table->unique(['buyer_user_id', 'idempotency_key']);
        });

        Schema::create('seller_orders', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('purchase_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('seller_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->string('status', 16)->default('placed');
            $table->unsignedInteger('items_centavos');
            $table->unsignedInteger('delivery_centavos');
            $table->unsignedInteger('total_centavos');
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->unique(['purchase_id', 'seller_id']);
            $table->index(['seller_id', 'status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('seller_order_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('product_id')->constrained()->restrictOnDelete();
            $table->string('sku', 32);
            $table->string('title');
            $table->string('image_url')->nullable();
            $table->unsignedInteger('unit_price_centavos');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('line_total_centavos');
            $table->timestamps();
        });

        Schema::create('order_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('seller_order_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('from_status', 16)->nullable();
            $table->string('to_status', 16);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('demo_payments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('purchase_id')->unique()->constrained()->restrictOnDelete();
            $table->string('status', 16);
            $table->unsignedInteger('amount_centavos');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['demo_payments', 'order_events', 'order_items', 'seller_orders', 'checkout_attempts', 'purchases', 'cart_items', 'carts'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
