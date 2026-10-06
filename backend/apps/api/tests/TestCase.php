<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Safety net: RefreshDatabase wipes whatever database is configured, and .env points at the
     * Neon dev branch. Everything except tests/Postgres must run on in-memory SQLite; this check
     * runs before any trait touches the database.
     */
    public function createApplication()
    {
        $app = parent::createApplication();
        $db = $app['config']['database'];
        $isPostgresSuite = str_starts_with(static::class, 'Tests\\Postgres\\');

        if (! $isPostgresSuite && ($db['default'] !== 'sqlite' || $db['connections']['sqlite']['database'] !== ':memory:')) {
            throw new RuntimeException('Refusing to run: Feature tests must use in-memory SQLite (check phpunit.xml).');
        }

        return $app;
    }
}
