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

Route::get('/debug/refresh-log', [\App\Http\Controllers\DebugController::class, 'showRefreshLog']);

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
    Route::post('portfolios/{portfolio}/items/{item}/add-purchase', [PortfolioItemController::class, 'addPurchase']);
    Route::get('portfolios/{portfolio}/items/{item}/transactions', [PortfolioItemController::class, 'transactions']);
    Route::delete('portfolios/{portfolio}/items/{item}/transactions/{transaction}', [PortfolioItemController::class, 'destroyTransaction']);
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
    Route::put('/user/ippanel-settings', [AuthController::class, 'updateIppanelSettings']);
    Route::get('/user/sms-stats', [AuthController::class, 'getSmsStats']);
    Route::get('/user/sms-history', [AuthController::class, 'getSmsHistory']);

    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);

    Route::get('/user-symbol-levels', [\App\Http\Controllers\UserSymbolLevelController::class, 'index']);
    Route::get('/user-symbol-levels/{symbol}/sent-counts', [\App\Http\Controllers\UserSymbolLevelController::class, 'sentCounts']);
    Route::post('/user-symbol-levels', [\App\Http\Controllers\UserSymbolLevelController::class, 'store']);
    Route::delete('/user-symbol-levels/{symbol}', [\App\Http\Controllers\UserSymbolLevelController::class, 'destroy']);

    // Portfolio SMS Settings
    Route::get('/portfolio-sms-settings', [\App\Http\Controllers\PortfolioSmsController::class, 'index']);
    Route::put('/portfolio-sms-settings/{portfolio}', [\App\Http\Controllers\PortfolioSmsController::class, 'update']);
    Route::post('/portfolio-sms-check', [\App\Http\Controllers\PortfolioSmsCheckController::class, 'check']);

    // Crossover Notifications
    Route::get('/crossover-notifications', [\App\Http\Controllers\CrossoverNotificationController::class, 'index']);
    Route::delete('/crossover-notifications', [\App\Http\Controllers\CrossoverNotificationController::class, 'destroy']);

    // Public system info (available to all authenticated users)
    Route::get('/system/schedule', function () {
        $schedule = \App\Models\SystemSetting::getSchedule();
        return response()->json(['data' => ['schedule' => $schedule]]);
    });

    Route::get('/system/last-refresh', function () {
        $lastRefreshAt = \App\Models\SystemSetting::get('last_refresh_at');
        return response()->json(['data' => ['last_refresh_at' => $lastRefreshAt]]);
    });

    Route::get('/debug/add-purchase-check', function () {
        try {
            $hasTable = \Illuminate\Support\Facades\Schema::hasTable('portfolio_item_transactions');
            $engine = null;
            $count = null;
            try {
                $status = \Illuminate\Support\Facades\DB::select("SHOW TABLE STATUS LIKE 'portfolio_item_transactions'");
                $engine = $status[0]->Engine ?? null;
            } catch (\Throwable $e) { $engine = 'error: '.$e->getMessage(); }
            try { $count = \Illuminate\Support\Facades\DB::table('portfolio_item_transactions')->count(); } catch (\Throwable $e) { $count = 'error: '.$e->getMessage(); }
            $canLock = 'unknown';
            try {
                \Illuminate\Support\Facades\DB::transaction(function () {
                    \App\Models\PortfolioItem::query()->lockForUpdate()->first();
                });
                $canLock = 'ok';
            } catch (\Throwable $e) { $canLock = 'fail: '.$e->getMessage(); }
            return response()->json(['hasTable'=>$hasTable, 'engine'=>$engine, 'count'=>$count, 'canLock'=>$canLock, 'php'=>PHP_VERSION]);
        } catch (\Throwable $e) {
            return response()->json(['error'=>$e->getMessage(), 'trace'=>$e->getTraceAsString()], 500);
        }
    });

    // Admin routes
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::put('/api-keys', [AdminController::class, 'updateApiKeys']);
        Route::post('/api-keys', [AdminController::class, 'addApiKey']);
        Route::delete('/api-keys/{index}', [AdminController::class, 'deleteApiKey']);
        Route::put('/schedule', [AdminController::class, 'updateSchedule']);
        Route::post('/refresh-symbols', [AdminController::class, 'refreshSymbols']);
        Route::put('/sms-settings', [AdminController::class, 'updateSmsSettings']);
        Route::post('/test-sms', [AdminController::class, 'testSms']);
        Route::post('/test-sms-user', [AdminController::class, 'testSmsWithUserKey']);
    });
});
