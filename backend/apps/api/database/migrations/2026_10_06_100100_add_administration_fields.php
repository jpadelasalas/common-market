<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase 5 (UI-13..UI-15): what an admin needs to review an application and moderate a listing.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_applications', function (Blueprint $table) {
            $table->unsignedInteger('number')->nullable()->unique(); // APP-003
            // Confidential application details (security matrix): admin-only DTOs.
            $table->string('contact_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('category_label')->nullable();
            $table->text('about')->nullable();
            $table->string('sample_image_url')->nullable();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('moderated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('moderated_at'));
        Schema::table('seller_applications', function (Blueprint $table) {
            $table->dropUnique(['number']);
            $table->dropColumn(['number', 'contact_name', 'contact_email', 'category_label', 'about', 'sample_image_url']);
        });
    }
};
