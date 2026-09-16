<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_unique(array_merge(
        [config('app.url'), 'http://localhost:5173', 'http://localhost:8000'],
        array_filter(array_map('trim', explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')))),
        array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))))
    ))),
    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.fuladpanjeh\.ir$/',
        '/^https:\/\/.*\.porta\.fuladpanjeh\.ir$/',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];