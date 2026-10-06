<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/** Full local demo: catalog plus order history. Feature tests seed CatalogSeeder only. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([CatalogSeeder::class, DemoOrdersSeeder::class]);
    }
}
