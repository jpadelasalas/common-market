<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// 'partially_refunded' is 18 characters; varchar(16) rejected it on PostgreSQL (SQLite never
// enforces string lengths, so only the Neon run exposed this).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demo_payments', fn (Blueprint $table) => $table->string('status', 32)->change());
    }

    public function down(): void
    {
        Schema::table('demo_payments', fn (Blueprint $table) => $table->string('status', 16)->change());
    }
};
