<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Database-enforced rules that SQLite cannot add after table creation (BR-09, DB-03..DB-08):
 * money and stock never negative, quantities positive, and a sequence for purchase numbers
 * (replaces max+1 under concurrency). PostgreSQL only; the in-memory SQLite test suite skips it.
 */
return new class extends Migration
{
    private const CHECKS = [
        'products' => ['products_price_nonnegative' => 'price_centavos >= 0'],
        'inventory' => ['inventory_quantity_nonnegative' => 'available_quantity >= 0'],
        'cart_items' => ['cart_items_quantity_positive' => 'quantity > 0'],
        'order_items' => ['order_items_quantity_positive' => 'quantity > 0', 'order_items_amounts_nonnegative' => 'unit_price_centavos >= 0 AND line_total_centavos >= 0'],
        'purchases' => ['purchases_totals_nonnegative' => 'items_centavos >= 0 AND delivery_centavos >= 0 AND total_centavos = items_centavos + delivery_centavos'],
        'seller_orders' => ['seller_orders_totals_consistent' => 'total_centavos = items_centavos + delivery_centavos'],
        'demo_payments' => ['demo_payments_amount_nonnegative' => 'amount_centavos >= 0'],
        'demo_adjustments' => ['demo_adjustments_amount_nonnegative' => 'amount_centavos >= 0'],
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }
        foreach (self::CHECKS as $table => $checks) {
            foreach ($checks as $name => $rule) {
                DB::statement("ALTER TABLE $table ADD CONSTRAINT $name CHECK ($rule)");
            }
        }
        // OWNED BY: dropping the purchases table (e.g. migrate:fresh) drops the sequence too,
        // so a fresh database always starts at CM-1001 instead of continuing an old counter.
        DB::statement('DROP SEQUENCE IF EXISTS purchase_number_seq');
        DB::statement('CREATE SEQUENCE purchase_number_seq START WITH 1001 OWNED BY purchases.number');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }
        DB::statement('DROP SEQUENCE IF EXISTS purchase_number_seq');
        foreach (self::CHECKS as $table => $checks) {
            foreach (array_keys($checks) as $name) {
                DB::statement("ALTER TABLE $table DROP CONSTRAINT IF EXISTS $name");
            }
        }
    }
};
