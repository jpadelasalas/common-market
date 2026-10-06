# Production image for the Common Market API (Render free web service, see render.yaml).
# FrankenPHP serves Laravel's public/ directly; no separate web server or PHP-FPM needed.

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts

FROM dunglas/frankenphp:1-php8.3
RUN install-php-extensions pdo_pgsql opcache intl zip bcmath
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini
WORKDIR /app
COPY --from=vendor /app /app
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr
RUN php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod +x docker/start.sh
# Render injects PORT; start.sh caches config, migrates, seeds an empty database, then serves.
CMD ["/app/docker/start.sh"]
