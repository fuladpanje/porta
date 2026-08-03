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

    public function refreshPrices(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!$user->is_admin) {
                return response()->json(['message' => 'فقط مدیر سیستم امکان بروزرسانی دستی را دارد.'], 403);
            }

            // Time-range check only applies to automatic/scheduled refreshes,
            // NOT to manual refresh triggered by the admin button.
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
                            return response()->json([
                                'message' => 'بازار بسته است. بروزرسانی خودکار در بازه زمانی غیرفعال انجام نمی‌شود.',
                                'updated' => 0,
                                'market_closed' => true,
                            ], 400);
                        }
                    }
                }
            }

            $apiKeys = $this->getSystemApiKeys();

            if (empty($apiKeys)) {
                return response()->json([
                    'message' => 'No API keys configured. Please ask admin to add an API key.',
                ], 400);
            }

            $symbols = $this->fetchAllSymbolsWithSystemKeys(true);

            if (empty($symbols)) {
                return response()->json([
                    'message' => 'دریافت قیمت‌ها از سرور بیرونی ممکن نیست. لطفاً با پشتیبانی تماس بگیرید.',
                    'updated' => 0,
                ], 400);
            }

            $symbolMap = [];
            foreach ($symbols as $symbol) {
                $isin = $symbol['isin'] ?? '';
                $name = $symbol['l18'] ?? $symbol['l30'] ?? '';
                $symbolMap[strtolower($name)] = $symbol;
                if ($isin) {
                    $symbolMap[strtolower($isin)] = $symbol;
                }
            }

            $updated = 0;

            // Update ALL users' portfolio items (not just the admin's)
            $allPortfolios = \App\Models\Portfolio::with('items')->get();
            foreach ($allPortfolios as $portfolio) {
                foreach ($portfolio->items as $item) {
                    $key = strtolower($item->symbol);
                    if (isset($symbolMap[$key])) {
                        $symbol = $symbolMap[$key];
                        $updateData = [];
                        $pl = $symbol['pl'] ?? null;
                        $pe = $symbol['pe'] ?? null;
                        if ($pl !== null && $pl != $item->last_price) {
                            $updateData['last_price'] = $pl;
                        }
                        if ($pe !== null && $pe != $item->pe) {
                            $updateData['pe'] = $pe;
                        }
                        if (!empty($updateData)) {
                            $item->update($updateData);
                            $updated++;
                        }
                    }
                }
            }

            // Mark all users as fresh and record the refresh timestamp (ISO 8601 UTC)
            \App\Models\User::query()->update(['is_stale' => false]);
            $refreshedAt = now()->utc()->toIso8601String();
            \App\Models\SystemSetting::set('last_refresh_at', $refreshedAt);

            return response()->json([
                'message' => 'Prices refreshed successfully',
                'updated' => $updated,
                'refreshed_at' => $refreshedAt,
            ]);
        } catch (\Throwable $e) {
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
