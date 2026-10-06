<?php

namespace App\Modules\Catalog;

/** Product visibility (state-models.md). Archive replaces deletion. */
enum Visibility: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Moderated = 'moderated';
}
