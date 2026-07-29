<?php

return [
    'class_namespace' => 'App\\Livewire',
    'view_path' => resource_path('views/livewire'),
    'layout' => 'components.layouts.app',
    'styles' => ['app'],
    'scripts' => ['app'],
    'asset_url' => null,
    'asset_version' => null,
    'manifest_path' => null,
    'temporary_file_upload' => [
        'disk' => null,
        'rules' => ['required|file|max:12288'],
    ],
];