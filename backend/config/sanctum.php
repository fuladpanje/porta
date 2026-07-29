<?php

use Laravel\Sanctum\Sanctum;

return [
    'prefix' => 'sanctum',
    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],
    'model' => App\Models\User::class,
    'use_database' => true,
    'personal_access_client' => [
        'client_id' => env('SANCTUM_CLIENT_ID'),
        'client_secret' => env('SANCTUM_CLIENT_SECRET'),
    ],
    'expiration' => null,
    'token_prefix' => '',
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost')),
];