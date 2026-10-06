<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase 4: fulfilment timestamps, cancellation, demo refunds (DB-08) and audit events (DB-09).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            // Short shop code for order references, e.g. KL-1001 (UI-09/UI-10).
            $table->string('code', 4)->nullable()->unique();
        });

        Schema::table('seller_orders', function (Blueprint $table) {
            $table->string('dispatch_reference', 64)->nullable();
            $table->string('cancel_reason', 200)->nullable();
            $table->string('cancelled_by', 16)->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
        });

        Schema::create('demo_adjustments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            // At most one refund per seller order: a repeated cancellation can never refund twice.
            $table->foreignUlid('seller_order_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('amount_centavos');
            $table->timestamps();
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('action', 64);
            $table->string('entity_type', 32);
            $table->string('entity_id', 26);
            // Safe changed fields only: never passwords, tokens or full addresses.
            $table->json('changes')->nullable();
            $table->string('request_id', 64)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('demo_adjustments');
        Schema::table('seller_orders', function (Blueprint $table) {
            $table->dropColumn(['dispatch_reference', 'cancel_reason', 'cancelled_by', 'shipped_at', 'delivered_at', 'cancelled_at']);
        });
        Schema::table('sellers', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn('code');
        });
    }
};
