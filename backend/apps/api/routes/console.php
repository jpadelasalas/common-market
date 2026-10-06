<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Hosted demo: seed fictional data on first boot only, never over existing data.
Artisan::command('demo:seed-if-empty', function () {
    if (User::query()->exists()) {
        $this->info('Demo data already present; skipping seed.');

        return;
    }
    $this->call('db:seed', ['--force' => true]);
})->purpose('Seed the fictional demo data when the database is empty');
