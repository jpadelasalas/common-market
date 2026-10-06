#!/bin/sh
# Container start for the hosted API. Environment comes from Render (see render.yaml).
set -e
php artisan config:cache
php artisan route:cache
php artisan migrate --force
php artisan demo:seed-if-empty
exec frankenphp php-server --root /app/public --listen ":${PORT:-10000}"
