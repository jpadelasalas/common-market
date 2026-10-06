<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Catalog\Models\Product;
use App\Modules\Sellers\Models\Seller;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Fictional catalog fixtures (database/outline.md): two approved sellers, one pending applicant,
 * twelve goods in three categories. Prices match canonical purchase CM-1001 (user-flows.md).
 * Every account uses DEMO_PASSWORD; never seed real people or reuse this on a public host.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('DEMO_PASSWORD', 'demo-password');
        $user = fn (string $name, string $email, string $role) => User::forceCreate(
            ['name' => $name, 'email' => $email, 'password' => $password, 'role' => $role, 'email_verified_at' => now()]
        );

        // Unsplash photos used on the Pencil canvas (sources in docs/design/canvas-inventory.json).
        // Products without a photo exercise the missing-image state.
        $photos = [
            'Stoneware mug, oat' => '1699391197173-511a372040ed',
            'Cotton hand towel' => '1564019472332-46106fe2b289',
            'Desk tray, walnut' => '1783508905249-c1d5b84c7c0a',
            'Woven storage basket' => '1543251796-6c716ef2187b',
            'Linen cushion cover' => '1675767529465-427ce7a2ab39',
            'Glass bud vase' => '1772210933003-f4dd0ab174ae',
        ];

        $user('Alex Rivera', 'alex@demo.test', 'buyer');
        $user('Admin Demo', 'admin@demo.test', 'admin');

        $shops = [
            ['Mara Santos', 'mara@demo.test', 'Kubo Living', 'approved', 'KL', [
                ['Stoneware mug, oat', 'kitchen', 45000, 12, 'Stoneware', '9 × 8 cm, 350 ml'],
                ['Cotton hand towel', 'everyday', 32000, 9, 'Cotton', '40 × 70 cm'],
                ['Linen cushion cover', 'home', 68000, 7, 'Linen', '45 × 45 cm'],
                ['Woven storage basket', 'home', 89000, 6, 'Water hyacinth', '30 × 30 × 25 cm'],
                ['Ceramic serving bowl', 'kitchen', 56000, 5, 'Stoneware', '22 cm diameter'],
                ['Glass bud vase', 'home', 39000, 4, 'Recycled glass', '14 cm tall'],
            ]],
            ['Ben Cruz', 'ben@demo.test', 'Daily Objects', 'approved', 'DO', [
                ['Desk tray, walnut', 'everyday', 79000, 8, 'Walnut', '30 × 20 × 3 cm'],
                ['Enamel coffee pot', 'kitchen', 98000, 5, 'Enamel steel', '1 L'],
                ['Canvas tote bag', 'everyday', 42000, 15, 'Cotton canvas', '38 × 42 cm'],
                ['Wooden spoon set', 'kitchen', 35000, 20, 'Acacia', '3 pieces, 30 cm'],
                ['Brass wall hooks, set of 3', 'home', 52000, 10, 'Brass', '6 cm each'],
                // Draft: must never appear in the public catalog.
                ['Recycled paper notebook', 'everyday', 18000, 30, 'Recycled paper', 'A5, 96 pages', 'draft'],
            ]],
            ['Lia Reyes', 'lia@demo.test', 'Sari Studio', 'pending', 'SS', []],
            ['Nina Reyes', 'nina@demo.test', 'Habi Home', 'pending', 'HH', []],
        ];

        // Fictional application details for the admin review screens (UI-13/UI-14).
        $applications = [
            'Kubo Living' => ['Home essentials', 'Warm, hand-finished goods for small homes.', null],
            'Daily Objects' => ['Everyday carry and desk goods', 'Simple tools that make daily routines easier.', null],
            'Sari Studio' => ['Kitchen and table', 'Small-batch ceramics and table linen from a two-person studio.', 'Stoneware mug, oat'],
            'Habi Home' => ['Home essentials', 'Thoughtful home goods, with a focus on woven storage and everyday organization.', 'Woven storage basket'],
        ];
        $number = 0;

        foreach ($shops as [$owner, $email, $shop, $status, $prefix, $goods]) {
            $seller = Seller::forceCreate([
                'owner_user_id' => $user($owner, $email, 'seller')->id,
                'name' => $shop,
                'status' => $status,
                'code' => $prefix,
            ]);
            [$categoryLabel, $about, $sample] = $applications[$shop];
            $seller->applications()->forceCreate([
                'number' => ++$number,
                'state' => $status,
                'contact_name' => $owner,
                'contact_email' => Str::slug($shop).'@example.test',
                'category_label' => $categoryLabel,
                'about' => $about,
                'sample_image_url' => $sample ? 'https://images.unsplash.com/photo-'.$photos[$sample].'?auto=format&fit=crop&w=800&q=80' : null,
                'reviewed_at' => $status === 'pending' ? null : now(),
            ]);

            foreach ($goods as $i => [$title, $category, $price, $stock, $material, $dimensions]) {
                $product = Product::forceCreate([
                    'seller_id' => $seller->id,
                    'sku' => sprintf('%s-%03d', $prefix, $i + 1),
                    'category' => $category,
                    'title' => $title,
                    'slug' => Str::slug($title),
                    'image_url' => isset($photos[$title]) ? 'https://images.unsplash.com/photo-'.$photos[$title].'?auto=format&fit=crop&w=800&q=80' : null,
                    'description' => "$title from $shop. Fictional listing for the Common Market demo.",
                    'material' => $material,
                    'dimensions' => $dimensions,
                    'price_centavos' => $price,
                    'visibility' => $goods[$i][6] ?? 'published',
                ]);
                $product->inventory()->forceCreate(['available_quantity' => $stock]);
            }
        }
    }
}
