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

    // Debug: تست نوتیفیکیشن بدون نیاز به کراس واقعی (فقط برای دیباگ هاست)
    Route::match(['get','post'], '/debug/test-notification', function (\Illuminate\Http\Request $request) {
        try {
            $user = $request->user();
            if (!$user) return response()->json(['message' => 'Unauthorized - no user'], 401);
            $symbol = $request->input('symbol', 'TEST');
            $level = $request->input('level_type', 'resistance_1');
            $levelValue = (float) $request->input('level_value', 1000);
            $price = (float) $request->input('price', 1005);
            $hasTable = \Illuminate\Support\Facades\Schema::hasTable('crossover_notifications');
            if (!$hasTable) {
                return response()->json(['message' => 'جدول crossover_notifications وجود ندارد', 'hasTable' => false, 'user_id' => $user->id], 500);
            }
            $hasSource = \Illuminate\Support\Facades\Schema::hasColumn('crossover_notifications', 'source');
            $hasDetected = \Illuminate\Support\Facades\Schema::hasColumn('crossover_notifications', 'detected_at');
            $nowTehran = now()->timezone('Asia/Tehran');
            // try Eloquent first, fallback to DB::table
            try {
                $data = [
                    'user_id' => $user->id,
                    'symbol' => substr($symbol, 0, 20),
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $price,
                    'old_price' => $levelValue - 10,
                    'direction' => 'up',
                    'detected_at' => $nowTehran,
                    'created_at' => $nowTehran,
                    'updated_at' => $nowTehran,
                ];
                if ($hasSource) $data['source'] = 'DEBUG';
                $n = \App\Models\CrossoverNotification::create($data);
                // لاگ موفقیت
                \Illuminate\Support\Facades\Log::info('test-notification created via Eloquent', ['id'=>$n->id, 'user'=>$user->id]);
                return response()->json(['message' => 'نوتیف تست ساخته شد (Eloquent)', 'data' => $n, 'method'=>'eloquent', 'now_tehran'=>$nowTehran->toDateTimeString()]);
            } catch (\Throwable $e2) {
                \Illuminate\Support\Facades\Log::warning('Eloquent create failed, trying DB::table', ['error'=>$e2->getMessage(), 'file'=>$e2->getFile().':'.$e2->getLine()]);
                // fallback raw insert
                $raw = [
                    'user_id' => $user->id,
                    'symbol' => substr($symbol, 0, 20),
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $price,
                    'old_price' => $levelValue - 10,
                    'direction' => 'up',
                    'detected_at' => $nowTehran->format('Y-m-d H:i:s'),
                    'created_at' => $nowTehran->format('Y-m-d H:i:s'),
                    'updated_at' => $nowTehran->format('Y-m-d H:i:s'),
                ];
                if ($hasSource) $raw['source'] = 'DEBUG';
                $id = \Illuminate\Support\Facades\DB::table('crossover_notifications')->insertGetId($raw);
                $n = \App\Models\CrossoverNotification::find($id);
                return response()->json(['message' => 'نوتیف تست ساخته شد (DB raw fallback)', 'data' => $n, 'method'=>'raw', 'eloquent_error'=>$e2->getMessage(), 'now_tehran'=>$nowTehran->toDateTimeString()]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('test-notification fatal', ['error'=>$e->getMessage(), 'trace'=>$e->getTraceAsString()]);
            return response()->json(['message' => 'خطا: ' . $e->getMessage(), 'file'=>$e->getFile().':'.$e->getLine(), 'trace' => explode("\n",$e->getTraceAsString())], 500);
        }
    });

    Route::get('/debug/notification-status', function (\Illuminate\Http\Request $request) {
        try {
            $user = $request->user();
            $schedule = \App\Models\SystemSetting::getSchedule();
            $hasTable = \Illuminate\Support\Facades\Schema::hasTable('crossover_notifications');
            $hasCooldownCol1 = $hasTable ? \Illuminate\Support\Facades\Schema::hasColumn('crossover_notifications', 'source') : false;
            $hasCooldownCol2 = \Illuminate\Support\Facades\Schema::hasColumn('portfolio_items', 'notification_cooldown_minutes');
            $hasCooldownCol3 = \Illuminate\Support\Facades\Schema::hasColumn('user_symbol_levels', 'notification_cooldown_minutes');
            $notifCount = $hasTable ? \App\Models\CrossoverNotification::where('user_id', $user->id)->count() : 0;
            $recent = $hasTable ? \App\Models\CrossoverNotification::where('user_id', $user->id)->orderByDesc('detected_at')->limit(3)->get() : [];
            $lastRefresh = \App\Models\SystemSetting::get('last_refresh_at');
            $lastCronRun = \App\Models\SystemSetting::get('schedule_last_symbols_refresh');
            $allSettings = \App\Models\SystemSetting::all()->pluck('setting_value', 'setting_key');
            // چک isMarketOpen منطق
            $isMarketOpen = true;
            if ($schedule['enabled'] && $schedule['start_time'] && $schedule['end_time']) {
                $now = now()->timezone('Asia/Tehran')->format('H:i');
                $start = $schedule['start_time'];
                $end = $schedule['end_time'];
                $isMarketOpen = $start <= $end ? ($now >= $start && $now <= $end) : ($now >= $start || $now <= $end);
            }
            $nowTehran = now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s');
            $nowUtc = now()->utc()->format('Y-m-d H:i:s');
            $dbDetectedAtDef = null;
            try {
                $cols = \Illuminate\Support\Facades\DB::select("SHOW CREATE TABLE crossover_notifications");
                $dbDetectedAtDef = $cols[0]->{'Create Table'} ?? null;
                if ($dbDetectedAtDef) {
                    preg_match('/`detected_at`[^,]+/', $dbDetectedAtDef, $m);
                    $dbDetectedAtDef = $m[0] ?? substr($dbDetectedAtDef, 0, 2000);
                }
            } catch (\Throwable $e) { $dbDetectedAtDef = 'error: '.$e->getMessage(); }

            return response()->json([
                'user_id' => $user->id,
                'schedule' => $schedule,
                'is_market_open_now' => $isMarketOpen,
                'now_tehran' => $nowTehran,
                'now_utc' => $nowUtc,
                'app_timezone' => config('app.timezone'),
                'has_table' => $hasTable,
                'has_source_col' => $hasCooldownCol1,
                'has_notif_cooldown_portfolio' => $hasCooldownCol2,
                'has_notif_cooldown_symbol' => $hasCooldownCol3,
                'notif_count' => $notifCount,
                'recent_notifications' => $recent,
                'last_refresh_at' => $lastRefresh,
                'schedule_last_symbols_refresh' => $lastCronRun ? date('Y-m-d H:i:s', (int)$lastCronRun) . " (raw: $lastCronRun)" : null,
                'detected_at_def' => $dbDetectedAtDef,
                'all_settings_keys' => $allSettings->keys()->toArray(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    });

    Route::get('/debug/portfolio-crossover-check', function (\Illuminate\Http\Request $request) {
        try {
            $user = $request->user();
            $portfolios = \App\Models\Portfolio::with('items')->where('user_id', $user->id)->get();
            $result = [];
            $schedule = \App\Models\SystemSetting::getSchedule();
            $isMarketOpen = true;
            if ($schedule['enabled'] && $schedule['start_time'] && $schedule['end_time']) {
                $now = now()->timezone('Asia/Tehran')->format('H:i');
                $isMarketOpen = $schedule['start_time'] <= $schedule['end_time'] ? ($now >= $schedule['start_time'] && $now <= $schedule['end_time']) : ($now >= $schedule['start_time'] || $now <= $schedule['end_time']);
            }
            // خواندن آخرین لاگ برای نمایش قیمت قبلی واقعی (قبل از آخرین رفرش)
            $lastChecks = [];
            try {
                $logPath = storage_path('logs/refresh-debug.log');
                if (is_file($logPath)) {
                    $lines = @file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    if ($lines) {
                        $lines = array_slice($lines, -800); // فقط ۸۰۰ خط آخر
                        foreach (array_reverse($lines) as $line) {
                            // نمونه: [2026-09-02 14:26:13] [CROSSOVER] [1/1] Portfolio check سیلور | {"user_id":5,"item_id":36,"isin":"...","old_price":13190,"new_price":13171,...}
                            if (strpos($line, 'Portfolio check') !== false && strpos($line, '"user_id":'.$user->id) !== false) {
                                $pos = strpos($line, '| {');
                                if ($pos !== false) {
                                    $json = substr($line, $pos+2);
                                    $data = json_decode($json, true);
                                    if ($data && isset($data['item_id'])) {
                                        $key = (int)$data['item_id'];
                                        if (!isset($lastChecks[$key])) {
                                            if (preg_match('/^\[(.*?)\]/', $line, $m)) $data['__timestamp'] = $m[1];
                                            $lastChecks[$key] = $data;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {}
            foreach ($portfolios as $pf) {
                foreach ($pf->items as $item) {
                    $cached = \Illuminate\Support\Facades\DB::table('symbols_cache')->where('symbol', $item->symbol)->first();
                    $cachedPrice = $cached ? $cached->last_price : null;
                    // قیمت قبلی واقعی از لاگ آخرین رفرش، اگر نبود از DB
                    $lastCheck = $lastChecks[$item->id] ?? null;
                    $displayOld = $lastCheck['old_price'] ?? $item->last_price;
                    $displayNew = $lastCheck['new_price'] ?? $cachedPrice;
                    $levels = [];
                    foreach (['resistance_1','resistance_2','support_1','support_2'] as $lvl) {
                        $val = $item->{$lvl};
                        if ($val === null || $val <= 0) continue;
                        // برای would_cross از مقادیر واقعی آخرین چک استفاده کن
                        $old = $lastCheck ? (float)$lastCheck['old_price'] : (float)($item->last_price ?? 0);
                        $new = $lastCheck ? (float)$lastCheck['new_price'] : ($cachedPrice ? (float)$cachedPrice : $old);
                        // اگر لاگ نداریم، fallback به DB
                        if (!$lastCheck) {
                            $old = (float)($item->last_price ?? 0);
                            $new = $cachedPrice ? (float)$cachedPrice : $old;
                        }
                        $isRes = str_starts_with($lvl, 'resistance');
                        $cross = null;
                        if ($isRes) {
                            if (($old < (float)$val && $new >= (float)$val) || ($old == (float)$val && $new > (float)$val)) $cross = 'up';
                        } else {
                            if (($old > (float)$val && $new <= (float)$val) || ($old == (float)$val && $new < (float)$val)) $cross = 'down';
                        }
                        $cooldown = $item->notification_cooldown_minutes ?? 10;
                        $lastNotif = \App\Models\CrossoverNotification::where('user_id',$user->id)->where('symbol',$item->symbol)->where('level_type',$lvl)->orderByDesc('detected_at')->first();
                        $cooldownInfo = null;
                        if ($lastNotif) {
                            $lastTime = $lastNotif->detected_at ?? $lastNotif->created_at;
                            if ($lastTime) {
                                $diff = $lastTime->diffInSeconds(now());
                                $cooldownInfo = "last={$lastTime} diff={$diff}s / ".($cooldown*60)."s";
                            } else {
                                $cooldownInfo = 'last=null';
                            }
                        }
                        $levels[] = [
                            'level'=>$lvl,
                            'level_value'=>$val,
                            'old_price'=>$old,
                            'cached_price'=>$new,
                            'would_cross'=>$cross,
                            'cooldown_minutes'=>$cooldown,
                            'cooldown_info'=>$cooldownInfo,
                            'market_open'=>$isMarketOpen,
                        ];
                    }
                    $result[] = [
                        'portfolio'=>$pf->name,
                        'portfolio_id'=>$pf->id,
                        'symbol'=>$item->symbol,
                        'last_price'=>$displayOld,
                        'cached_price'=>$displayNew,
                        'last_check_old'=>$lastCheck['old_price'] ?? null,
                        'last_check_new'=>$lastCheck['new_price'] ?? null,
                        'last_check_time'=>$lastCheck['__timestamp'] ?? null,
                        'levels'=>$levels,
                    ];
                }
            }
            // also user_symbol_levels
            $symbolLevels = \App\Models\UserSymbolLevel::where('user_id',$user->id)->get();
            $symbolResult = [];
            foreach ($symbolLevels as $sl) {
                $cached = \Illuminate\Support\Facades\DB::table('symbols_cache')->where('symbol',$sl->symbol)->first();
                $cachedPrice = $cached ? $cached->last_price : null;
                $levels = [];
                foreach (['resistance_1','resistance_2','support_1','support_2'] as $lvl) {
                    $val = $sl->{$lvl};
                    if ($val === null || $val <=0) continue;
                    $old = $cachedPrice ? (float)$cachedPrice : null; // for symbol_levels old is from cache, we show cached as both old/new for now
                    $levels[] = ['level'=>$lvl,'value'=>$val,'cached_price'=>$cachedPrice];
                }
                if (!empty($levels)) $symbolResult[] = ['symbol'=>$sl->symbol,'levels'=>$levels];
            }
            return response()->json(['portfolios'=>$result,'user_symbol_levels'=>$symbolResult,'schedule'=>$schedule,'is_market_open'=>$isMarketOpen,'now_tehran'=>now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s')]);
        } catch (\Throwable $e) {
            return response()->json(['error'=>$e->getMessage(),'file'=>$e->getFile().':'.$e->getLine(),'trace'=>explode("\n",$e->getTraceAsString())],500);
        }
    });

    Route::post('/debug/simulate-cross', function (\Illuminate\Http\Request $request) {
        try {
            $user = $request->user();
            $symbol = $request->input('symbol');
            $level = $request->input('level_type', 'resistance_1');
            $levelValue = (float)$request->input('level_value');
            $oldPrice = (float)$request->input('old_price');
            $newPrice = (float)$request->input('new_price');
            if (!$symbol || !$levelValue) return response()->json(['message'=>'symbol و level_value الزامی است'],422);
            // پیدا کردن آیتم
            $item = \App\Models\PortfolioItem::whereHas('portfolio', fn($q)=>$q->where('user_id',$user->id))->where('symbol',$symbol)->first();
            if (!$item) {
                $sl = \App\Models\UserSymbolLevel::where('user_id',$user->id)->where('symbol',$symbol)->first();
                if (!$sl) return response()->json(['message'=>'نماد در پرتفو یا سطوح کاربر یافت نشد'],404);
                // simulate for user_symbol_level
                $svc = new \App\Services\CrossoverDetectionService();
                $detected = $svc->checkSymbolLevel($sl, $newPrice, $oldPrice);
                return response()->json(['mode'=>'user_symbol_level','detected'=>$detected]);
            }
            // موقتا سطح را ست کن اگر لازم
            if ($levelValue) $item->{$level} = $levelValue;
            $svc = new \App\Services\CrossoverDetectionService();
            $detected = $svc->checkPortfolioItem($item, $newPrice, $oldPrice);
            return response()->json(['mode'=>'portfolio_item','item_id'=>$item->id,'detected'=>$detected,'old'=>$oldPrice,'new'=>$newPrice,'level'=>$level,'level_value'=>$levelValue]);
        } catch (\Throwable $e) {
            return response()->json(['error'=>$e->getMessage(),'file'=>$e->getFile().':'.$e->getLine(),'trace'=>explode("\n",$e->getTraceAsString())],500);
        }
    });

    // Debug: اجرای اجباری تشخیص کراس با bypass بازار - واقعاً نوتیفیکیشن ایجاد می‌کند
    Route::post('/debug/force-detect', function (\Illuminate\Http\Request $request) {
        try {
            $user = $request->user();
            $svc = new \App\Services\CrossoverDetectionService();
            $results = [];

            $portfolios = \App\Models\Portfolio::with('items', 'user')->where('user_id', $user->id)->get();
            foreach ($portfolios as $portfolio) {
                foreach ($portfolio->items as $item) {
                    $itemResult = [
                        'symbol' => $item->symbol,
                        'portfolio' => $portfolio->name,
                        'last_price' => $item->last_price,
                        'prev_last_price' => null,
                        'levels' => [],
                        'detected' => [],
                    ];

                    // خواندن fresh از DB
                    $freshItem = \App\Models\PortfolioItem::find($item->id);
                    if ($freshItem) {
                        $itemResult['prev_last_price'] = $freshItem->prev_last_price;
                        $itemResult['last_price'] = $freshItem->last_price;
                    }

                    $levels = [];
                    foreach (['resistance_1','resistance_2','support_1','support_2'] as $lvl) {
                        $val = $item->{$lvl};
                        if ($val !== null && $val > 0) {
                            $levels[] = ['level' => $lvl, 'value' => (float)$val];
                        }
                    }
                    $itemResult['levels'] = $levels;

                    if (empty($levels) || !$item->last_price) {
                        $itemResult['skip'] = 'no_levels_or_price';
                        $results[] = $itemResult;
                        continue;
                    }

                    // تعیین oldPrice و newPrice
                    $newPrice = (float) $item->last_price;
                    $oldPrice = null;
                    if ($freshItem && $freshItem->prev_last_price !== null && (float)$freshItem->prev_last_price > 0) {
                        $oldPrice = (float) $freshItem->prev_last_price;
                    }

                    if ($oldPrice === null) {
                        $oldPrice = $newPrice;
                    }

                    $itemResult['old_price_used'] = $oldPrice;
                    $itemResult['new_price_used'] = $newPrice;

                    if ($oldPrice == $newPrice) {
                        $itemResult['skip'] = 'old_equals_new_no_prev';
                        $results[] = $itemResult;
                        continue;
                    }

                    // اجرای واقعی تشخیص با force
                    $item->loadMissing('portfolio.user');
                    $detected = $svc->checkPortfolioItem($item, $newPrice, $oldPrice, true);
                    $itemResult['detected'] = $detected;
                    $results[] = $itemResult;
                }
            }

            // user_symbol_levels
            $symbolLevels = \App\Models\UserSymbolLevel::where('user_id', $user->id)->get();
            $slResults = [];
            foreach ($symbolLevels as $sl) {
                $cached = \Illuminate\Support\Facades\DB::table('symbols_cache')->where('symbol', $sl->symbol)->first();
                if (!$cached) {
                    $slResults[] = ['symbol' => $sl->symbol, 'skip' => 'no_cache'];
                    continue;
                }
                $newPrice = (float) ($cached->last_price ?? 0);
                $oldPrice = null;
                if (isset($cached->prev_last_price) && $cached->prev_last_price !== null && (float)$cached->prev_last_price > 0) {
                    $oldPrice = (float) $cached->prev_last_price;
                }
                if ($oldPrice === null || $oldPrice == $newPrice) {
                    $slResults[] = ['symbol' => $sl->symbol, 'skip' => 'no_valid_prev', 'cached' => $cached->last_price, 'prev' => $cached->prev_last_price ?? null];
                    continue;
                }
                $detected = $svc->checkSymbolLevel($sl, $newPrice, $oldPrice, true);
                $slResults[] = ['symbol' => $sl->symbol, 'old' => $oldPrice, 'new' => $newPrice, 'detected' => $detected];
            }

            $notifCount = \App\Models\CrossoverNotification::where('user_id', $user->id)->count();

            return response()->json([
                'message' => 'اجرای اجباری تشخیص کراس انجام شد',
                'portfolio_items' => $results,
                'symbol_levels' => $slResults,
                'total_notifications' => $notifCount,
                'now_tehran' => now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage(), 'file' => $e->getFile().':'.$e->getLine()], 500);
        }
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
