FROM php:8.2-apache

# Install dependencies and PHP extensions for MongoDB and GD (image processing)
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    libpng-dev \
    libjpeg-dev \
    libwebp-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb

# Enable Apache mod_rewrite for nice URLs if needed later
RUN a2enmod rewrite

# Increase upload limits for large JSON card dumps
RUN echo "upload_max_filesize = 32M\npost_max_size = 64M\nmemory_limit = 128M" \
    > /usr/local/etc/php/conf.d/uploads.ini
