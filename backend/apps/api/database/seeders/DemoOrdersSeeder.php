<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use App\Modules\Checkout\Models\Cart;
use App\Modules\Checkout\PlaceOrder;
use App\Modules\Orders\Models\SellerOrder;
use App\Modules\Orders\OrderStatus;
use App\Modules\Orders\OrderTransitions;
use Illuminate\Database\Seeder;

/**
 * Order history for the demo, created through the real checkout and fulfilment services so every
 * stock movement, event and payment record is consistent. CM-1001 matches the design fixture:
 * Kubo Living processing, Daily Objects placed (user-flows.md).
 */
class DemoOrdersSeeder extends Seeder
{
    public function run(PlaceOrder $placeOrder): void
    {
        $password = env('DEMO_PASSWORD', 'demo-password');
        $jamie = User::forceCreate(['name' => 'Jamie Cruz', 'email' => 'jamie@demo.test', 'password' => $password, 'role' => 'buyer']);
        $robin = User::forceCreate(['name' => 'Robin Lee', 'email' => 'robin@demo.test', 'password' => $password, 'role' => 'buyer']);
        $alex = User::where('email', 'alex@demo.test')->sole();
        $mara = User::where('email', 'mara@demo.test')->sole();

        $buy = function (User $buyer, array $lines, array $address) use ($placeOrder): array {
            $cart = Cart::firstOrCreate(['buyer_user_id' => $buyer->id])->refresh();
            foreach ($lines as $sku => $quantity) {
                $product = Product::where('sku', $sku)->sole();
                $cart->items()->forceCreate(['product_id' => $product->id, 'quantity' => $quantity, 'unit_price_centavos' => $product->price_centavos]);
            }
            [$attempt] = $placeOrder($buyer, 'seed-'.$buyer->id, [
                'cart_version' => $cart->version,
                'address' => $address + ['recipient_name' => $buyer->name, 'delivery_note' => null],
                'demo_outcome' => 'success',
            ]);

            return SellerOrder::where('purchase_id', $attempt->purchase_id)->orderBy('sequence')->get()->all();
        };

        [$kubo1001] = $buy($alex, ['KL-001' => 2, 'KL-002' => 1, 'DO-001' => 1],
            ['address_line' => '24 Sample Lane, Demo District', 'city' => 'Quezon City', 'postcode' => '1100', 'delivery_note' => 'Leave with the building reception.']);
        OrderTransitions::advance($kubo1001->id, OrderStatus::Processing, 1, $mara);

        $buy($jamie, ['KL-003' => 1], ['address_line' => '8 Example Street, Sample Village', 'city' => 'Pasig City', 'postcode' => '1600']);

        [$kubo1003] = $buy($robin, ['KL-006' => 1, 'KL-005' => 1], ['address_line' => '15 Placeholder Road', 'city' => 'Makati City', 'postcode' => '1200']);
        OrderTransitions::advance($kubo1003->id, OrderStatus::Processing, 1, $mara);
        OrderTransitions::advance($kubo1003->id, OrderStatus::Shipped, 2, $mara, 'DEMO-PH-0003');
    }
}
