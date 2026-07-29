<?php
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->boot();

$response = $kernel->handle(
    Illuminate\Http\Request::create("/api/register", "POST", [
        "name" => "Test User",
        "email" => "newuser4@example.com",
        "password" => "password123",
        "password_confirmation" => "password123",
    ], [], [], ["CONTENT_TYPE" => "application/json"])
);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Body: " . $response->getContent() . "\n";

$kernel->terminate(
    Illuminate\Http\Request::create("/api/register", "POST", [
        "name" => "Test User",
        "email" => "newuser4@example.com",
        "password" => "password123",
        "password_confirmation" => "password123",
    ], [], [], ["CONTENT_TYPE" => "application/json"]),
    $response
);

