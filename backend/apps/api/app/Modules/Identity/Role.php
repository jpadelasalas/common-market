<?php

namespace App\Modules\Identity;

enum Role: string
{
    case Buyer = 'buyer';
    case Seller = 'seller';
    case Admin = 'admin';
}
