<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// DB-02: sellers and their admin-reviewed applications.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellers', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('owner_user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->string('status', 16)->default('pending')->index();
            $table->timestamps();
        });

        Schema::create('seller_applications', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('seller_id')->constrained()->restrictOnDelete();
            $table->string('state', 16)->default('pending')->index();
            $table->text('review_reason')->nullable();
            $table->foreignUlid('reviewer_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_applications');
        Schema::dropIfExists('sellers');
    }
};
