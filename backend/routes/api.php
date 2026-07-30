<?php

use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\PortfolioItemController;
use App\Http\Controllers\StockController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::put('portfolios/{portfolio}/fee-settings', [PortfolioController::class, 'updateCommission']);
    Route::put('portfolios/{portfolio}/toggle-active', [PortfolioController::class, 'toggleActive']);
    Route::apiResource('portfolios', PortfolioController::class);
    Route::get('/dashboard', [PortfolioController::class, 'dashboard']);
    Route::post('portfolios/{portfolio}/items', [PortfolioItemController::class, 'store']);
    Route::put('portfolios/{portfolio}/items/{item}', [PortfolioItemController::class, 'update']);
    Route::delete('portfolios/{portfolio}/items/{item}', [PortfolioItemController::class, 'destroy']);
    Route::get('portfolios/{portfolio}/items', [PortfolioItemController::class, 'index']);
    Route::get('portfolios/{portfolio}/items/{item}', [PortfolioItemController::class, 'show']);
    Route::post('stocks/refresh', [StockController::class, 'refreshPrices']);
    Route::get('stocks/symbols', [StockController::class, 'symbols']);
    Route::put('/user/unit', [AuthController::class, 'updateUnit']);
    Route::put('/user/auto-switch', [AuthController::class, 'updateAutoSwitch']);
    Route::put('/user/schedule', [AuthController::class, 'updateSchedule']);
    Route::put('/user/fee-settings', [AuthController::class, 'updateCommission']);
    Route::put('/user/password', [AuthController::class, 'changePassword']);

    Route::get('/api-keys', [ApiKeyController::class, 'index']);
    Route::post('/api-keys', [ApiKeyController::class, 'store']);
    Route::get('/api-keys/{apiKey}', [ApiKeyController::class, 'show']);
    Route::put('/api-keys/{apiKey}', [ApiKeyController::class, 'update']);
    Route::delete('/api-keys/{apiKey}', [ApiKeyController::class, 'destroy']);
    Route::post('/api-keys/{apiKey}/default', [ApiKeyController::class, 'setDefault']);
});
