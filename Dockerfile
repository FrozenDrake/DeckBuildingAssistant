FROM php:8.2-apache

# Install dependencies and PHP extensions for MongoDB
RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    pkg-config \
    libssl-dev \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb

# Enable Apache mod_rewrite for nice URLs if needed later
RUN a2enmod rewrite

