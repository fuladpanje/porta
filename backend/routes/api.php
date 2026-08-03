<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\FavoriteController;
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
    Route::post('stocks/refresh', [StockController::class, 'refreshPrices'])
        ->withoutMiddleware([
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Auth\Middleware\AuthenticateSession::class,
        ]);
    Route::get('stocks/symbols', [StockController::class, 'symbols']);
    Route::put('/user/unit', [AuthController::class, 'updateUnit']);
    Route::put('/user/auto-switch', [AuthController::class, 'updateAutoSwitch']);
    Route::put('/user/schedule', [AuthController::class, 'updateSchedule']);
    Route::put('/user/fee-settings', [AuthController::class, 'updateCommission']);
    Route::put('/user/password', [AuthController::class, 'changePassword']);
    Route::put('/user/stale', [AuthController::class, 'updateStale']);

    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);

    // Public system info (available to all authenticated users)
    Route::get('/system/schedule', function () {
        $schedule = \App\Models\SystemSetting::getSchedule();
        return response()->json(['data' => ['schedule' => $schedule]]);
    });

    Route::get('/system/last-refresh', function () {
        $lastRefreshAt = \App\Models\SystemSetting::get('last_refresh_at');
        return response()->json(['data' => ['last_refresh_at' => $lastRefreshAt]]);
    });

    // Admin routes
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::put('/api-keys', [AdminController::class, 'updateApiKeys']);
        Route::post('/api-keys', [AdminController::class, 'addApiKey']);
        Route::delete('/api-keys/{index}', [AdminController::class, 'deleteApiKey']);
        Route::put('/schedule', [AdminController::class, 'updateSchedule']);
        Route::post('/refresh-symbols', [AdminController::class, 'refreshSymbols']);
    });
});
