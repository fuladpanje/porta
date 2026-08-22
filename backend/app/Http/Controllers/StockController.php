<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class StockController extends Controller
{
    private static ?array $symbolsCache = null;
    private static int $symbolsCacheTime = 0;

    private function fetchAllSymbols(string $apiKey, bool $force = false): array
    {
        $url = 'https://Api.BrsApi.ir/Tsetmc/AllSymbols.php?key=' . $apiKey;

        if (!$force && self::$symbolsCache !== null && self::$symbolsCacheTime > time() - 300) {
            return self::$symbolsCache;
        }

        try {
            $response = Http::timeout(15)->get($url);

            if ($response->successful()) {
                $data = $response->json();
                $result = [];

                if (is_array($data) && array_is_list($data)) {
                    $result = $data;
                } elseif (is_array($data)) {
                    foreach (['data', 'result', 'symbols', 'items'] as $key) {
                        if (isset($data[$key]) && is_array($data[$key]) && array_is_list($data[$key])) {
                            $result = $data[$key];
                            break;
                        }
                    }
                }

                self::$symbolsCache = $result;
                self::$symbolsCacheTime = time();
                return $result;
            } elseif ($response->status() === 403) {
                \Illuminate\Support\Facades\Log::warning('BRS API returned 403 Forbidden', [
                    'key_prefix' => substr($apiKey, 0, 8) . '...',
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('BRS API fetchAllSymbols failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }

    /**
     * Get system-wide API keys from system_settings
     */
    private function getSystemApiKeys(): array
    {
        $apiKeys = SystemSetting::getApiKeys();
        $autoSwitch = SystemSetting::getAutoSwitch();

        if (empty($apiKeys)) {
            return [];
        }

        if (!$autoSwitch) {
            $defaultKey = null;
            foreach ($apiKeys as $key) {
                if ($key['is_default'] ?? false) {
                    $defaultKey = $key;
                    break;
                }
            }
            if ($defaultKey) {
                return [$defaultKey];
            }
            return [$apiKeys[0]];
        }

        return $apiKeys;
    }

    private function fetchAllSymbolsWithSystemKeys(bool $force = false): array
    {
        $apiKeys = $this->getSystemApiKeys();

        foreach ($apiKeys as $keyInfo) {
            $symbols = $this->fetchAllSymbols($keyInfo['api_key'], $force);
            if (!empty($symbols)) {
                return $symbols;
            }
        }

        return [];
    }

    /**
     * @deprecated Use getSystemApiKeys() instead
     */
    private function getUserApiKeys(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            return [];
        }

        return $this->getSystemApiKeys();
    }

    /**
     * @deprecated Use fetchAllSymbolsWithSystemKeys() instead
     */
    private function fetchAllSymbolsWithFallback(array $apiKeys, bool $force = false): array
    {
        return $this->fetchAllSymbolsWithSystemKeys($force);
    }

    public function symbols(Request $request): JsonResponse
    {
        $query = $request->input('q') ?? '';
        $force = $request->boolean('force', false);

        try {
            $symbols = $this->getSymbolsFromDatabase($query, $force);

            return response()->json([
                'data' => $symbols['data'],
                'from_cache' => $symbols['from_cache'],
                'last_updated' => $symbols['last_updated'],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('symbols search failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'data' => [],
                'from_cache' => true,
                'last_updated' => null,
                'message' => 'خطا در دریافت نمادها',
            ], 200);
        }
    }

    /**
     * Get symbols from database cache, fallback to API if stale
     */
    private function getSymbolsFromDatabase(string $query, bool $force): array
    {
        $cacheAge = \App\Models\SystemSetting::get('symbols_cache_age_minutes', '10');
        $maxAgeMinutes = (int) $cacheAge;

        $hasCacheTable = \Illuminate\Support\Facades\Schema::hasTable('symbols_cache');
        $lastUpdated = $hasCacheTable
            ? \Illuminate\Support\Facades\DB::table('symbols_cache')->max('last_updated_at')
            : null;

        $isFresh = $lastUpdated && now()->diffInMinutes(now()->parse($lastUpdated)) < $maxAgeMinutes;

        if ($isFresh && !$force) {
            $symbols = $this->querySymbolsCache($query);
            return [
                'data' => $symbols,
                'from_cache' => true,
                'last_updated' => $lastUpdated,
            ];
        }

        $apiSymbols = $this->fetchAllSymbolsWithSystemKeys($force);

        if (!empty($apiSymbols)) {
            try {
                if ($hasCacheTable) {
                    $this->saveSymbolsToCache($apiSymbols);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to save symbols cache', [
                    'error' => $e->getMessage(),
                ]);
            }
            $symbols = $this->transformApiSymbols($apiSymbols, $query);
            return [
                'data' => $symbols,
                'from_cache' => false,
                'last_updated' => now()->toDateTimeString(),
            ];
        }

        if ($hasCacheTable) {
            $symbols = $this->querySymbolsCache($query);
        } else {
            $symbols = [];
        }

        return [
            'data' => $symbols,
            'from_cache' => true,
            'last_updated' => $lastUpdated,
        ];
    }

    /**
     * Query symbols_cache table
     */
    private function querySymbolsCache(string $query): array
    {
        $db = \Illuminate\Support\Facades\DB::table('symbols_cache');

        if (!empty($query)) {
            $q = mb_strtolower($query);
            $db->where(function ($qBuilder) use ($q) {
                $qBuilder->whereRaw('LOWER(symbol) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(full_name) LIKE ?', ["%{$q}%"])
                    ->orWhereRaw('LOWER(isin) LIKE ?', ["%{$q}%"]);
            });
        }

        $rows = $db->orderBy('symbol')->get();

        $result = $rows->map(function ($row) {
            return [
                'isin' => $row->isin,
                'name' => $row->symbol,
                'fullName' => $row->full_name,
                'pl' => $row->last_price,
                'pe' => $row->pe,
                'plp' => $row->price_change_percent,
                'pcp' => $row->price_change,
                'cs' => $row->sector,
                'Buy_I_Volume' => $row->buy_i_volume,
                'Buy_CountI' => $row->buy_count_i,
                'Sell_I_Volume' => $row->sell_i_volume,
                'Sell_CountI' => $row->sell_count_i,
            ];
        })->toArray();

        if (!empty($query)) {
            $q = mb_strtolower($query);
            $result = array_map(function ($s) use ($q) {
                $name = mb_strtolower($s['name'] ?? '');
                $fullName = mb_strtolower($s['fullName'] ?? '');
                $s['_start'] = (mb_strpos($name, $q) === 0 || mb_strpos($fullName, $q) === 0) ? 0 : 1;
                return $s;
            }, $result);

            usort($result, function ($a, $b) {
                if ($a['_start'] !== $b['_start']) {
                    return $a['_start'] - $b['_start'];
                }
                return strcmp($a['name'], $b['name']);
            });

            $result = array_map(function ($item) {
                unset($item['_start']);
                return $item;
            }, $result);
        }

        return $result;
    }

    /**
     * Save API symbols to database cache
     */
    private function saveSymbolsToCache(array $apiSymbols): void
    {
        $now = now();

        foreach ($apiSymbols as $symbol) {
            $isin = $symbol['isin'] ?? '';
            if (empty($isin)) continue;

            \Illuminate\Support\Facades\DB::table('symbols_cache')->updateOrInsert(
                ['isin' => $isin],
                [
                    'symbol' => $symbol['l18'] ?? $symbol['l30'] ?? '',
                    'full_name' => $symbol['l30'] ?? '',
                    'last_price' => is_numeric($symbol['pl'] ?? null) ? $symbol['pl'] : null,
                    'pe' => is_numeric($symbol['pe'] ?? null) ? $symbol['pe'] : null,
                    'price_change_percent' => is_numeric($symbol['plp'] ?? null) ? $symbol['plp'] : null,
                    'price_change' => is_numeric($symbol['pcp'] ?? null) ? $symbol['pcp'] : null,
                    'sector' => is_string($symbol['cs'] ?? null) ? $symbol['cs'] : null,
                    'buy_i_volume' => is_numeric($symbol['Buy_I_Volume'] ?? null) ? $symbol['Buy_I_Volume'] : null,
                    'buy_count_i' => is_numeric($symbol['Buy_CountI'] ?? null) ? $symbol['Buy_CountI'] : null,
                    'sell_i_volume' => is_numeric($symbol['Sell_I_Volume'] ?? null) ? $symbol['Sell_I_Volume'] : null,
                    'sell_count_i' => is_numeric($symbol['Sell_CountI'] ?? null) ? $symbol['Sell_CountI'] : null,
                    'last_updated_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        \App\Models\SystemSetting::set('symbols_cache_age_minutes', '10');
    }

    /**
     * Transform raw API symbols to frontend format
     */
    private function transformApiSymbols(array $apiSymbols, string $query = ''): array
    {
        $result = array_map(function ($symbol) {
            return [
                'isin' => $symbol['isin'] ?? '',
                'name' => $symbol['l18'] ?? $symbol['l30'] ?? '',
                'fullName' => $symbol['l30'] ?? '',
                'pl' => $symbol['pl'] ?? null,
                'pe' => $symbol['pe'] ?? null,
                'plp' => $symbol['plp'] ?? null,
                'pcp' => $symbol['pcp'] ?? null,
                'cs' => $symbol['cs'] ?? null,
                'Buy_I_Volume' => $symbol['Buy_I_Volume'] ?? null,
                'Buy_CountI' => $symbol['Buy_CountI'] ?? null,
                'Sell_I_Volume' => $symbol['Sell_I_Volume'] ?? null,
                'Sell_CountI' => $symbol['Sell_CountI'] ?? null,
            ];
        }, $apiSymbols);

        if (!empty($query)) {
            $q = mb_strtolower($query);
            $result = array_filter($result, function ($s) use ($q) {
                return mb_stripos($s['name'] ?? '', $q) !== false ||
                       mb_stripos($s['fullName'] ?? '', $q) !== false ||
                       mb_stripos($s['isin'] ?? '', $q) !== false;
            });

            $result = array_map(function ($s) use ($q) {
                $name = mb_strtolower($s['name'] ?? '');
                $fullName = mb_strtolower($s['fullName'] ?? '');
                $s['_start'] = (mb_strpos($name, $q) === 0 || mb_strpos($fullName, $q) === 0) ? 0 : 1;
                return $s;
            }, array_values($result));

            usort($result, function ($a, $b) {
                if ($a['_start'] !== $b['_start']) {
                    return $a['_start'] - $b['_start'];
                }
                return strcmp($a['name'], $b['name']);
            });

            $result = array_map(function ($item) {
                unset($item['_start']);
                return $item;
            }, $result);
        } else {
            usort($result, function ($a, $b) {
                return strcmp($a['name'], $b['name']);
            });
        }

        return $result;
    }

    private static function debugLog(string $step, string $message, array $extra = []): void
    {
        $path = storage_path('logs/refresh-debug.log');
        $time = now()->format('Y-m-d H:i:s');
        $extraStr = $extra ? ' | ' . json_encode($extra, JSON_UNESCAPED_UNICODE) : '';
        $line = "[$time] [$step] $message$extraStr\n";
        @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
        @error_log("Porta Debug: [$step] $message$extraStr");
    }

    public function refreshPrices(Request $request): JsonResponse
    {
        $reqId = substr(uniqid(), -6);
        self::debugLog('START', "refreshPrices called [req:$reqId]", [
            'user_id' => $request->user()?->id,
            'is_admin' => $request->user()?->is_admin,
            'manual' => $request->boolean('manual', false),
            'memory_peak' => round(memory_get_peak_usage(true) / 1024 / 1024, 1) . 'MB',
        ]);

        try {
            @set_time_limit(120);
            $user = $request->user();

            if (!$user) {
                self::debugLog('ERROR', 'No authenticated user');
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!$user->is_admin) {
                self::debugLog('ERROR', 'User is not admin', ['user_id' => $user->id]);
                return response()->json(['message' => 'فقط مدیر سیستم امکان بروزرسانی دستی را دارد.'], 403);
            }

            $lockKey = 'refresh_lock';
            $lockValue = now()->toIso8601String();
            $lockAcquired = \App\Models\SystemSetting::updateOrCreate(
                ['setting_key' => $lockKey],
                ['setting_value' => $lockValue, 'description' => 'Lock to prevent concurrent refresh']
            );

            $existingLock = \App\Models\SystemSetting::where('setting_key', $lockKey)->value('setting_value');
            if ($existingLock && $existingLock !== $lockValue) {
                $lockTime = \App\Models\SystemSetting::where('setting_key', $lockKey)->value('updated_at');
                if ($lockTime && now()->diffInMinutes($lockTime) < 5) {
                    self::debugLog('ERROR', 'Another refresh is in progress, skipping');
                    return response()->json([
                        'message' => 'یک بروزرسانی دیگر در حال اجراست. لطفاً چند ثانیه صبر کنید.',
                    ], 409);
                }
            }

            $isManual = $request->boolean('manual', false);
            if (!$isManual) {
                $schedule = \App\Models\SystemSetting::getSchedule();
                if ($schedule['enabled']) {
                    $start = $schedule['start_time'];
                    $end = $schedule['end_time'];
                    if ($start && $end) {
                        $now = now()->format('H:i');
                        $inRange = $start <= $end
                            ? ($now >= $start && $now <= $end)
                            : ($now >= $start || $now <= $end);
                        if (!$inRange) {
                            self::debugLog('INFO', 'Market closed', ['start' => $start, 'end' => $end, 'now' => $now]);
                            return response()->json([
                                'message' => 'بازار بسته است. بروزرسانی خودکار در بازه زمانی غیرفعال انجام نمی‌شود.',
                                'updated' => 0,
                                'market_closed' => true,
                            ], 400);
                        }
                    }
                }
            }

            self::debugLog('STEP1', 'Loading API keys...');
            $apiKeys = $this->getSystemApiKeys();
            self::debugLog('STEP1', 'API keys loaded', ['count' => count($apiKeys)]);

            if (empty($apiKeys)) {
                self::debugLog('ERROR', 'No API keys configured');
                return response()->json([
                    'message' => 'No API keys configured. Please ask admin to add an API key.',
                ], 400);
            }

            self::debugLog('STEP2', 'Fetching symbols from BRS API...');
            $maxRetries = 3;
            $retryDelay = 30;
            $symbols = [];

            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                if ($attempt > 1) {
                    self::debugLog('RETRY', "Attempt $attempt of $maxRetries, waiting {$retryDelay}s...");
                    sleep($retryDelay);
                }

                $symbols = $this->fetchAllSymbolsWithSystemKeys(true);
                self::debugLog('STEP2', "Symbols fetched (attempt $attempt)", ['count' => count($symbols)]);

                if (!empty($symbols)) {
                    break;
                }
            }

            if (empty($symbols)) {
                self::debugLog('ERROR', "All $maxRetries attempts failed");
                return response()->json([
                    'message' => "دریافت قیمت‌ها پس از $maxRetries تلاش ناموفق بود. لطفاً با پشتیبانی تماس بگیرید.",
                    'updated' => 0,
                ], 400);
            }

            self::debugLog('STEP3', 'Building symbol map...');
            $symbolMap = [];
            foreach ($symbols as $symbol) {
                $isin = $symbol['isin'] ?? '';
                $name = $symbol['l18'] ?? $symbol['l30'] ?? '';
                $symbolMap[strtolower($name)] = $symbol;
                if ($isin) {
                    $symbolMap[strtolower($isin)] = $symbol;
                }
            }
            self::debugLog('STEP3', 'Symbol map built', ['keys' => count($symbolMap)]);

            $oldPrices = [];
            $isinList = array_filter(array_map(fn($s) => $s['isin'] ?? '', $symbols));
            if (!empty($isinList)) {
                $oldRows = \Illuminate\Support\Facades\DB::table('symbols_cache')
                    ->whereIn('isin', $isinList)
                    ->select('isin', 'last_price')
                    ->get();
                foreach ($oldRows as $row) {
                    $oldPrices[$row->isin] = $row->last_price;
                }
            }

            $updated = 0;

            @set_time_limit(120);

            self::debugLog('STEP4', 'Loading all portfolios...');
            $allPortfolios = \App\Models\Portfolio::with('items', 'user')->get();
            self::debugLog('STEP4', 'Portfolios loaded', ['count' => $allPortfolios->count()]);

            $totalItems = $allPortfolios->sum(fn($p) => $p->items->count());
            self::debugLog('STEP4B', 'Starting item updates...', ['total_items' => $totalItems]);

            $smsService = new \App\Services\SmsService();
            $crossoverService = new \App\Services\CrossoverDetectionService();
            $smsCount = 0;
            $allCrossovers = [];

            \Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 5');
            self::debugLog('STEP4C', 'MySQL lock timeout set to 5s');

            $itemIdx = 0;
            foreach ($allPortfolios as $portfolio) {
                foreach ($portfolio->items as $item) {
                    $itemIdx++;
                    $key = strtolower($item->symbol);
                    if (isset($symbolMap[$key])) {
                        $symbol = $symbolMap[$key];
                        $updateData = [];
                        if ($item->is_custom) {
                            $updateData['is_custom'] = false;
                        }
                        $pl = $symbol['pl'] ?? null;
                        $pe = $symbol['pe'] ?? null;
                        if ($pl !== null && $pl != $item->last_price) {
                            $updateData['last_price'] = $pl;
                        }
                        if ($pe !== null && $pe != $item->pe) {
                            $updateData['pe'] = $pe;
                        }
                        $buyIVolume = $symbol['Buy_I_Volume'] ?? null;
                        $buyCountI = $symbol['Buy_CountI'] ?? null;
                        $sellIVolume = $symbol['Sell_I_Volume'] ?? null;
                        $sellCountI = $symbol['Sell_CountI'] ?? null;
                        if ($buyIVolume !== null && $buyIVolume != $item->buy_i_volume) {
                            $updateData['buy_i_volume'] = $buyIVolume;
                        }
                        if ($buyCountI !== null && $buyCountI != $item->buy_count_i) {
                            $updateData['buy_count_i'] = $buyCountI;
                        }
                        if ($sellIVolume !== null && $sellIVolume != $item->sell_i_volume) {
                            $updateData['sell_i_volume'] = $sellIVolume;
                        }
                        if ($sellCountI !== null && $sellCountI != $item->sell_count_i) {
                            $updateData['sell_count_i'] = $sellCountI;
                        }
                        if (!empty($updateData)) {
                            $updateData['updated_at'] = now();
                            self::debugLog('ITEM', "[$itemIdx/$totalItems] Updating {$item->symbol} (id:{$item->id})", ['fields' => array_keys($updateData)]);
                            try {
                                \Illuminate\Support\Facades\DB::table('portfolio_items')
                                    ->where('id', $item->id)
                                    ->update($updateData);
                                $updated++;
                            } catch (\Throwable $e) {
                                self::debugLog('ERROR', "[$itemIdx/$totalItems] FAILED {$item->symbol}", [
                                    'item_id' => $item->id,
                                    'error' => $e->getMessage(),
                                    'code' => $e->getCode(),
                                ]);
                            }
                        }

                        if ($pl !== null) {
                            $item->loadMissing('portfolio.user');
                            try {
                                $sent = $smsService->checkAndNotify($item, (float) $pl);
                                $smsCount += count($sent);
                            } catch (\Throwable $e) {
                                self::debugLog('ERROR', "[$itemIdx/$totalItems] SMS check failed {$item->symbol}", [
                                    'error' => $e->getMessage(),
                                ]);
                            }
                            try {
                                $detected = $crossoverService->checkPortfolioItem($item, (float) $pl, $item->last_price ? (float) $item->last_price : null);
                                $allCrossovers = array_merge($allCrossovers, $detected);
                            } catch (\Throwable $e) {
                                self::debugLog('ERROR', "[$itemIdx/$totalItems] Crossover check failed {$item->symbol}", [
                                    'error' => $e->getMessage(),
                                ]);
                            }
                        }
                    }
                }
            }

            self::debugLog('STEP4D', 'Checking user symbol levels for SMS/notifications...');
            try {
                $usersWithSymbolLevels = \App\Models\User::whereHas('userSymbolLevels', function ($q) {
                        $q->where(function ($q2) {
                            $q2->where('resistance_1', '!=', null)
                                ->orWhere('resistance_2', '!=', null)
                                ->orWhere('support_1', '!=', null)
                                ->orWhere('support_2', '!=', null);
                        });
                    })
                    ->get();

                foreach ($usersWithSymbolLevels as $user) {
                    $levels = $user->userSymbolLevels()->get();
                    foreach ($levels as $levelRecord) {
                        $key = strtolower($levelRecord->symbol);
                        if (isset($symbolMap[$key])) {
                            $symbol = $symbolMap[$key];
                            $pl = $symbol['pl'] ?? null;
                            if ($pl !== null) {
                                try {
                                    $isin = $symbol['isin'] ?? '';
                                    $oldPrice = $oldPrices[$isin] ?? null;
                                    $sent = $smsService->checkAndNotifySymbolLevel($user, $levelRecord->symbol, (float) $pl, $oldPrice ? (float) $oldPrice : null);
                                    $smsCount += count($sent);
                                } catch (\Throwable $e) {
                                    self::debugLog('ERROR', "User symbol level SMS check failed {$levelRecord->symbol}", [
                                        'user_id' => $user->id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                                try {
                                    $isin = $symbol['isin'] ?? '';
                                    $oldPrice = $oldPrices[$isin] ?? null;
                                    $detected = $crossoverService->checkSymbolLevel($levelRecord, (float) $pl, $oldPrice ? (float) $oldPrice : null);
                                    $allCrossovers = array_merge($allCrossovers, $detected);
                                } catch (\Throwable $e) {
                                    self::debugLog('ERROR', "User symbol level crossover check failed {$levelRecord->symbol}", [
                                        'user_id' => $user->id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                self::debugLog('ERROR', 'User symbol level SMS/notification check failed', ['error' => $e->getMessage()]);
            }

            self::debugLog('STEP5', 'Checking portfolio daily SMS...');
            try {
                $portfolioSmsCount = \App\Console\Commands\SendPortfolioDailySms::sendDailyPortfolioSms();
                $smsCount += $portfolioSmsCount;
            } catch (\Throwable $e) {
                self::debugLog('ERROR', 'Portfolio daily SMS failed', ['error' => $e->getMessage()]);
            }

            self::debugLog('STEP6', 'Updating user stale flags...');
            try {
                \App\Models\User::query()->update(['is_stale' => false]);
            } catch (\Throwable $e) {
                self::debugLog('ERROR', 'Stale update failed', ['error' => $e->getMessage()]);
            }

            self::debugLog('STEP6', 'Saving last_refresh_at...');
            try {
                $refreshedAt = now()->utc()->toIso8601String();
                \App\Models\SystemSetting::set('last_refresh_at', $refreshedAt);
            } catch (\Throwable $e) {
                self::debugLog('ERROR', 'Save refresh_at failed', ['error' => $e->getMessage()]);
                $refreshedAt = now()->utc()->toIso8601String();
            }

            try {
                \App\Models\SystemSetting::where('setting_key', $lockKey)->delete();
            } catch (\Throwable $e) {
                self::debugLog('ERROR', 'Failed to delete lock', ['error' => $e->getMessage()]);
            }

            if (\Illuminate\Support\Facades\Schema::hasTable('crossover_notifications')) {
                try {
                    \App\Models\CrossoverNotification::cleanup(7);
                } catch (\Throwable $e) {
                    self::debugLog('ERROR', 'Failed to cleanup crossover notifications', ['error' => $e->getMessage()]);
                }
            }

            self::debugLog('DONE', 'Refresh completed successfully', [
                'updated' => $updated,
                'sms_sent' => $smsCount,
                'crossovers' => count($allCrossovers),
                'memory_peak' => round(memory_get_peak_usage(true) / 1024 / 1024, 1) . 'MB',
            ]);

            return response()->json([
                'message' => 'Prices refreshed successfully',
                'updated' => $updated,
                'sms_sent' => $smsCount,
                'crossovers' => $allCrossovers,
                'refreshed_at' => $refreshedAt,
            ]);
        } catch (\Throwable $e) {
            self::debugLog('ERROR', 'EXCEPTION CAUGHT', [
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
                'code' => $e->getCode(),
                'trace_first_line' => explode("\n", $e->getTraceAsString())[0] ?? '',
                'memory_peak' => round(memory_get_peak_usage(true) / 1024 / 1024, 1) . 'MB',
            ]);
            \Illuminate\Support\Facades\Log::error('refreshPrices failed', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ]);
            return response()->json([
                'message' => 'خطا در بروزرسانی قیمت‌ها: ' . $e->getMessage(),
            ], 500);
        }
    }
}
