<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class StockController extends Controller
{
    private static ?array $symbolsCache = null;
    private static int $symbolsCacheTime = 0;

    private function fetchAllSymbols(string $apiKey): array
    {
        if (self::$symbolsCache !== null && (time() - self::$symbolsCacheTime) < 3600) {
            return self::$symbolsCache;
        }

        $url = 'https://Api.BrsApi.ir/Tsetmc/AllSymbols.php?key=' . $apiKey;

        try {
            $response = Http::timeout(30)->get($url);

            if ($response->successful()) {
                $data = $response->json();

                if (is_array($data) && array_is_list($data)) {
                    self::$symbolsCache = $data;
                } elseif (is_array($data)) {
                    foreach (['data', 'result', 'symbols', 'items'] as $key) {
                        if (isset($data[$key]) && is_array($data[$key]) && array_is_list($data[$key])) {
                            self::$symbolsCache = $data[$key];
                            break;
                        }
                    }
                    if (self::$symbolsCache === null) {
                        self::$symbolsCache = [];
                    }
                } else {
                    self::$symbolsCache = [];
                }

                self::$symbolsCacheTime = time();
                return self::$symbolsCache;
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('BRS API fetchAllSymbols failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return [];
    }

    private function trackApiKeyUsage($keyId): void
    {
        try {
            $apiKey = \App\Models\ApiKey::find($keyId);
            if (!$apiKey) return;

            $now = now();
            if (!$apiKey->last_reset_at || $apiKey->last_reset_at->diffInHours($now) >= 24) {
                $apiKey->update(['daily_requests' => 1, 'last_reset_at' => $now]);
            } else {
                $apiKey->increment('daily_requests');
            }
        } catch (\Exception $e) {
            // silent
        }
    }

    private function getUserApiKeys(Request $request): array
    {
        $user = $request->user();
        if (!$user) {
            return [];
        }

        if (!$user->auto_switch) {
            $defaultKey = $user->apiKeys()->where('is_default', true)->first();
            if ($defaultKey) {
                return [[
                    'id' => $defaultKey->id,
                    'api_key' => $defaultKey->api_key,
                    'is_default' => true,
                ]];
            }
            return [];
        }

        $keys = $user->apiKeys()->orderBy('created_at', 'asc')->get();

        return $keys->map(function ($key) {
            return [
                'id' => $key->id,
                'api_key' => $key->api_key,
                'is_default' => $key->is_default,
            ];
        })->toArray();
    }

    private function fetchAllSymbolsWithFallback(array $apiKeys): array
    {
        $lastError = null;

        foreach ($apiKeys as $keyInfo) {
            $this->trackApiKeyUsage($keyInfo['id']);
            $symbols = $this->fetchAllSymbols($keyInfo['api_key']);
            if (!empty($symbols)) {
                return $symbols;
            }
        }

        return [];
    }

    public function symbols(Request $request): JsonResponse
    {
        $apiKeys = $this->getUserApiKeys($request);

        if (empty($apiKeys)) {
            return response()->json([
                'message' => 'کلید API تنظیم نشده است. لطفاً در صفحه تنظیمات یک کلید API اضافه کنید.',
            ], 400);
        }

        $query = $request->input('q', '');

        $symbols = $this->fetchAllSymbolsWithFallback($apiKeys);

        if (empty($symbols)) {
            return response()->json([
                'message' => 'دریافت نمادها از سرور بیرونی ممکن نیست. لطفاً وضعیت اشتراک خود در brsapi.ir را بررسی کنید.',
                'data' => [],
            ]);
        }

        if (!empty($query)) {
            $q = mb_strtolower($query);
            $symbols = array_filter($symbols, function ($symbol) use ($q) {
                return mb_stripos($symbol['l18'] ?? '', $q) !== false ||
                       mb_stripos($symbol['l30'] ?? '', $q) !== false ||
                       mb_stripos($symbol['isin'] ?? '', $q) !== false;
            });

            $result = array_map(function ($symbol) use ($q) {
                $name = $symbol['l18'] ?? $symbol['l30'] ?? '';
                $lowerName = mb_strtolower($name);
                $isStart = mb_strpos($lowerName, $q) === 0;
                return [
                    'isin' => $symbol['isin'] ?? '',
                    'name' => $name,
                    'fullName' => $symbol['l30'] ?? '',
                    'pl' => $symbol['pl'] ?? null,
                    'pe' => $symbol['pe'] ?? null,
                    'plp' => $symbol['plp'] ?? null,
                    'pcp' => $symbol['pcp'] ?? null,
                    'cs' => $symbol['cs'] ?? null,
                    '_start' => $isStart ? 0 : 1,
                ];
            }, array_values($symbols));

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
            }, array_values($symbols));

            usort($result, function ($a, $b) {
                return strcmp($a['name'], $b['name']);
            });
        }

        return response()->json([
            'data' => $result,
        ]);
    }

    public function refreshPrices(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $apiKeys = $this->getUserApiKeys($request);

        if (empty($apiKeys)) {
            return response()->json([
                'message' => 'No API keys configured. Please add an API key in settings.',
            ], 400);
        }

        $symbols = $this->fetchAllSymbolsWithFallback($apiKeys);

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

        foreach ($user->portfolios()->with('items')->get() as $portfolio) {
            foreach ($portfolio->items as $item) {
                $key = strtolower($item->symbol);

                if (isset($symbolMap[$key])) {
                    $symbol = $symbolMap[$key];
                    $pl = $symbol['pl'] ?? null;
                    $pe = $symbol['pe'] ?? null;

                    if ($pl !== null && $pl != $item->last_price) {
                        $item->update(['last_price' => $pl]);
                        $updated++;
                    }

                    if ($pe !== null && $pe != $item->pe) {
                        $item->update(['pe' => $pe]);
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Prices refreshed successfully',
            'updated' => $updated,
        ]);
    }
}