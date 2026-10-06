<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// DB-03 / DB-04: seller-scoped products and one inventory row per product.
// ponytail: nonnegative price/stock is enforced by validation only; add CHECK constraints
// once the database is PostgreSQL (SQLite cannot add them via ALTER).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('seller_id')->constrained()->restrictOnDelete();
            $table->string('sku', 32);
            $table->string('category', 16);
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('image_url')->nullable();
            $table->string('material')->nullable();
            $table->string('dimensions')->nullable();
            $table->unsignedInteger('price_centavos');
            $table->string('visibility', 16)->default('draft');
            $table->text('moderation_reason')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();

            $table->unique(['seller_id', 'sku']);
            $table->index(['visibility', 'category', 'price_centavos']);
        });

        Schema::create('inventory', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('available_quantity')->default(0);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
        Schema::dropIfExists('products');
    }
};
