<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class RefreshSymbols extends Command
{
    protected $signature = 'symbols:refresh {--final : بروزرسانی نهایی ساعت پایان بازار} {--post-market : تلاش مجدد بعد از اتمام بازار} {--reset-post-market : ریست تنظیمات بعد از بازار}';
    protected $description = 'بروزرسانی خودکار نمادها از BRS API و ذخیره در دیتابیس';

    private int $maxRetries = 3;
    private int $retryDelay = 30;

    private function debugLog(string $message, array $context = []): void
    {
        try {
            $line = '[' . now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s') . '] [REFRESH] ' . $message;
            if ($context) {
                $line .= ' | ' . json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            $line .= PHP_EOL;
            @file_put_contents(
                storage_path('logs/refresh-debug.log'),
                $line,
                FILE_APPEND | LOCK_EX
            );
        } catch (\Throwable $e) {
            // Diagnostics must never interrupt price refreshes.
        }
    }

    public function handle(): int
    {
        $isFinal = $this->option('final');
        $isPostMarket = $this->option('post-market');
        $isResetPostMarket = $this->option('reset-post-market');

        if ($isResetPostMarket) {
            $this->info('ریست تنظیمات بعد از بازار...');
            SystemSetting::set('post_market_final_refresh_done', 'false');
            SystemSetting::set('post_market_attempts', '0');
            SystemSetting::set('schedule_last_post_market_refresh', '0');
            $this->info('تنظیمات بعد از بازار با موفقیت ریست شد.');
            return 0;
        }

        if ($isFinal) {
            $this->info('شروع بروزرسانی نهایی ساعت پایان بازار...');
        } elseif ($isPostMarket) {
            $this->info('شروع تلاش مجدد بعد از اتمام بازار...');
        } else {
            $this->info('شروع بروزرسانی نمادها...');
        }

        $attempt = 0;
        $success = false;

        while ($attempt < $this->maxRetries && !$success) {
            $attempt++;

            if ($attempt > 1) {
                $this->info("تلاش {$attempt} از {$this->maxRetries}...");
                sleep($this->retryDelay);
            }

            $result = $this->attemptRefresh();

            if ($result === 0) {
                $success = true;

                if ($isFinal) {
                    SystemSetting::set('post_market_final_refresh_done', 'true');
                    $this->info('بروزرسانی نهایی با موفقیت انجام شد.');
                } elseif ($isPostMarket) {
                    SystemSetting::set('post_market_final_refresh_done', 'true');
                    $this->info('بروزرسانی بعد از بازار با موفقیت انجام شد.');
                } else {
                    $this->info('بروزرسانی نمادها با موفقیت انجام شد.');
                }
            } else {
                $this->error("تلاش {$attempt} ناموفق بود.");

                if ($attempt >= $this->maxRetries) {
                    $this->error("تمام تلاش‌ها ناموفق بود. آخرین خطا ثبت شد.");

                    if ($isPostMarket) {
                        $this->error('بروزرسانی بعد از بازار ناموفق بود. لطفاً بروزرسانی دستی انجام دهید.');
                    }
                }
            }
        }

        return $success ? 0 : 1;
    }

    private function attemptRefresh(): int
    {
        try {
            $apiKeys = SystemSetting::getApiKeys();

            if (empty($apiKeys)) {
                $this->error('هیچ کلید API تنظیم نشده است.');
                return 1;
            }

            $symbols = $this->fetchSymbolsFromApi($apiKeys);

            if (empty($symbols)) {
                $this->error('دریافت نمادها از API ناموفق بود.');
                return 1;
            }

            $this->info(count($symbols) . ' نماد دریافت شد. در حال ذخیره‌سازی...');

            $oldPrices = $this->collectOldPrices($symbols);

            $this->saveSymbolsToDatabase($symbols);

            $this->updatePortfolioPrices($symbols, $oldPrices);

            return 0;
        } catch (\Throwable $e) {
            $this->error('خطا در بروزرسانی: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error('RefreshSymbols attempt failed', [
                'error' => $e->getMessage(),
            ]);
            return 1;
        }
    }

    private function fetchSymbolsFromApi(array $apiKeys): array
    {
        $autoSwitch = SystemSetting::getAutoSwitch();

        if (!$autoSwitch) {
            $defaultKey = null;
            foreach ($apiKeys as $key) {
                if ($key['is_default'] ?? false) {
                    $defaultKey = $key;
                    break;
                }
            }
            if (!$defaultKey && !empty($apiKeys)) {
                $defaultKey = $apiKeys[0];
            }
            $apiKeys = $defaultKey ? [$defaultKey] : [];
        }

        foreach ($apiKeys as $keyInfo) {
            $apiKey = $keyInfo['api_key'] ?? '';
            if (empty($apiKey)) continue;

            $url = 'https://Api.BrsApi.ir/Tsetmc/AllSymbols.php?key=' . $apiKey;

            try {
                $response = Http::timeout(30)->get($url);

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

                    if (!empty($result)) {
                        $this->info('کلید API موفق: ' . substr($apiKey, 0, 8) . '...');
                        return $result;
                    }
                }
            } catch (\Throwable $e) {
                $this->warn('خطا با کلید ' . substr($apiKey, 0, 8) . '...: ' . $e->getMessage());
            }
        }

        return [];
    }

    private function collectOldPrices(array $symbols): array
    {
        $isinList = [];
        foreach ($symbols as $symbol) {
            $isin = trim((string) ($symbol['isin'] ?? ''));
            if ($isin) {
                $isinList[] = $isin;
            }
        }

        if (empty($isinList)) {
            return [];
        }

        $rows = DB::table('symbols_cache')
            ->whereIn('isin', $isinList)
            ->select('isin', 'last_price')
            ->get();

        $oldPrices = [];
        foreach ($rows as $row) {
            $oldPrices[trim((string) $row->isin)] = $row->last_price;
        }

        return $oldPrices;
    }

    private function saveSymbolsToDatabase(array $symbols): void
    {
        $now = now();
        $hasPrevCol = Schema::hasColumn('symbols_cache', 'prev_last_price');
        $batch = [];

        foreach ($symbols as $symbol) {
            $isin = $symbol['isin'] ?? '';
            if (empty($isin)) continue;

            $newPrice = is_numeric($symbol['pl'] ?? null) ? $symbol['pl'] : null;
            $row = [
                'isin' => $isin,
                'symbol' => $symbol['l18'] ?? $symbol['l30'] ?? '',
                'full_name' => $symbol['l30'] ?? '',
                'last_price' => $newPrice,
                'pe' => is_numeric($symbol['pe'] ?? null) ? $symbol['pe'] : null,
                'price_change_percent' => is_numeric($symbol['plp'] ?? null) ? $symbol['plp'] : null,
                'price_change' => is_numeric($symbol['pcp'] ?? null) ? $symbol['pcp'] : null,
                'sector' => $symbol['cs'] ?? null,
                'buy_i_volume' => is_numeric($symbol['Buy_I_Volume'] ?? null) ? $symbol['Buy_I_Volume'] : null,
                'buy_count_i' => is_numeric($symbol['Buy_CountI'] ?? null) ? $symbol['Buy_CountI'] : null,
                'sell_i_volume' => is_numeric($symbol['Sell_I_Volume'] ?? null) ? $symbol['Sell_I_Volume'] : null,
                'sell_count_i' => is_numeric($symbol['Sell_CountI'] ?? null) ? $symbol['Sell_CountI'] : null,
                'last_updated_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if ($hasPrevCol && $newPrice !== null) {
                try {
                    $existing = DB::table('symbols_cache')->where('isin', $isin)->first();
                    if ($existing && $existing->last_price !== null && $existing->last_price != $newPrice) {
                        $row['prev_last_price'] = $existing->last_price;
                    }
                } catch (\Throwable $e) {}
            }

            $batch[] = $row;
        }

        $chunks = array_chunk($batch, 500);
        foreach ($chunks as $chunk) {
            foreach ($chunk as $row) {
                $isin = $row['isin'];
                $data = $row;
                unset($data['isin']);
                // جداگانه prev_last_price را فقط در صورت نیاز ست کن تا مقدار null قبلی پاک نشود
                if (!array_key_exists('prev_last_price', $data) || $data['prev_last_price'] === null) {
                    unset($data['prev_last_price']);
                }
                DB::table('symbols_cache')->updateOrInsert(
                    ['isin' => $isin],
                    $data
                );
            }
        }

        $this->info(count($batch) . ' نماد در دیتابیس ذخیره شد.');
    }

    private function updatePortfolioPrices(array $symbols, array $oldPrices = []): void
    {
        @set_time_limit(120);

        $this->debugLog('Price snapshot ready', [
            'api_symbols' => count($symbols),
            'old_price_rows' => count($oldPrices),
        ]);

        $symbolMap = [];
        foreach ($symbols as $symbol) {
            $isin = trim((string) ($symbol['isin'] ?? ''));
            $name = $symbol['l18'] ?? $symbol['l30'] ?? '';
            $symbolMap[strtolower(trim($name))] = $symbol;
            if ($isin) {
                $symbolMap[strtolower(trim($isin))] = $symbol;
            }
        }

        $updated = 0;
        $errors = 0;
        $smsCount = 0;
        $crossoverCount = 0;

        \Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 5');

        $smsService = new \App\Services\SmsService();
        $crossoverService = new \App\Services\CrossoverDetectionService();
        $portfolios = \App\Models\Portfolio::with('items', 'user')->get();
        foreach ($portfolios as $portfolio) {
            foreach ($portfolio->items as $item) {
                $key = strtolower(trim($item->symbol));

                if (isset($symbolMap[$key])) {
                    $symbol = $symbolMap[$key];
                    $pl = $symbol['pl'] ?? null;
                    $pe = $symbol['pe'] ?? null;
                    $buyIVolume = $symbol['Buy_I_Volume'] ?? null;
                    $buyCountI = $symbol['Buy_CountI'] ?? null;
                    $sellIVolume = $symbol['Sell_I_Volume'] ?? null;
                    $sellCountI = $symbol['Sell_CountI'] ?? null;

                    $updateData = [];
                    if ($pl !== null && $pl != $item->last_price) {
                        if (Schema::hasColumn('portfolio_items', 'prev_last_price') && $item->last_price !== null) {
                            $updateData['prev_last_price'] = $item->last_price;
                        }
                        $updateData['last_price'] = $pl;
                    }
                    if ($pe !== null && $pe != $item->pe) {
                        $updateData['pe'] = $pe;
                    }
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
                        try {
                            \Illuminate\Support\Facades\DB::table('portfolio_items')
                                ->where('id', $item->id)
                                ->update($updateData);
                            $updated++;
                        } catch (\Throwable $e) {
                            $errors++;
                            $this->warn("Failed to update item {$item->id} ({$item->symbol}): " . $e->getMessage());
                        }
                    }

                    if ($pl !== null) {
                        // Crossover FIRST: ثبت نوتیفیکیشن نباید به سرنوشت ارسال SMS گره بخورد.
                        try {
                            // Use the market snapshot collected before symbols_cache is overwritten.
                            // This is more reliable than the portfolio model value when a manual
                            // refresh and the scheduler run close together on shared hosting.
                            $isin = trim((string) ($symbol['isin'] ?? ''));
                            $oldPrice = array_key_exists($isin, $oldPrices) && $oldPrices[$isin] !== null
                                ? (float) $oldPrices[$isin]
                                : ($item->last_price !== null ? (float) $item->last_price : null);
                            $detected = $crossoverService->checkPortfolioItem($item, (float) $pl, $oldPrice);
                            $crossoverCount += count($detected);
                        } catch (\Throwable $e) {
                            $this->warn("Crossover check failed for {$item->symbol}: " . $e->getMessage());
                        }
                        try {
                            $item->loadMissing('portfolio.user');
                            $sent = $smsService->checkAndNotify($item, (float) $pl);
                            $smsCount += count($sent);
                        } catch (\Throwable $e) {
                            $this->warn("SMS check failed for {$item->symbol}: " . $e->getMessage());
                        }

                        if ($item->resistance_1 || $item->resistance_2 || $item->support_1 || $item->support_2) {
                            $isin = trim((string) ($symbol['isin'] ?? ''));
                            $this->debugLog('Portfolio crossover check', [
                                'user_id' => $portfolio->user_id,
                                'item_id' => $item->id,
                                'symbol' => $item->symbol,
                                'isin' => $isin,
                                'old_price' => array_key_exists($isin, $oldPrices) ? $oldPrices[$isin] : null,
                                'new_price' => $pl,
                                'levels' => [
                                    'resistance_1' => $item->resistance_1,
                                    'resistance_2' => $item->resistance_2,
                                    'support_1' => $item->support_1,
                                    'support_2' => $item->support_2,
                                ],
                            ]);
                        }
                    }
                } elseif ($item->resistance_1 || $item->resistance_2 || $item->support_1 || $item->support_2) {
                    $this->debugLog('Portfolio symbol not matched in API response', [
                        'user_id' => $portfolio->user_id,
                        'item_id' => $item->id,
                        'symbol' => $item->symbol,
                    ]);
                }
            }
        }

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
                    $key = strtolower(trim($levelRecord->symbol));
                    if (isset($symbolMap[$key])) {
                        $symbol = $symbolMap[$key];
                        $pl = $symbol['pl'] ?? null;
                        if ($pl !== null) {
                            $isin = trim((string) ($symbol['isin'] ?? ''));
                            $this->debugLog('User symbol-level crossover check', [
                                'user_id' => $user->id,
                                'level_id' => $levelRecord->id,
                                'symbol' => $levelRecord->symbol,
                                'isin' => $isin,
                                'old_price' => array_key_exists($isin, $oldPrices) ? $oldPrices[$isin] : null,
                                'new_price' => $pl,
                                'levels' => [
                                    'resistance_1' => $levelRecord->resistance_1,
                                    'resistance_2' => $levelRecord->resistance_2,
                                    'support_1' => $levelRecord->support_1,
                                    'support_2' => $levelRecord->support_2,
                                ],
                            ]);
                            try {
                                $isin = trim((string) ($symbol['isin'] ?? ''));
                                $oldPrice = $oldPrices[$isin] ?? null;
                                $detected = $crossoverService->checkSymbolLevel($levelRecord, (float) $pl, $oldPrice ? (float) $oldPrice : null);
                                $crossoverCount += count($detected);
                            } catch (\Throwable $e) {
                                $this->warn("User symbol level crossover check failed for {$levelRecord->symbol}: " . $e->getMessage());
                            }
                            try {
                                $isin = trim((string) ($symbol['isin'] ?? ''));
                                $oldPrice = $oldPrices[$isin] ?? null;
                                $sent = $smsService->checkAndNotifySymbolLevel($user, $levelRecord->symbol, (float) $pl, $oldPrice ? (float) $oldPrice : null);
                                $smsCount += count($sent);
                            } catch (\Throwable $e) {
                                $this->warn("User symbol level SMS check failed for {$levelRecord->symbol}: " . $e->getMessage());
                            }
                        }
                    } elseif ($levelRecord->hasAnyLevel()) {
                        $this->debugLog('User symbol-level symbol not matched in API response', [
                            'user_id' => $user->id,
                            'level_id' => $levelRecord->id,
                            'symbol' => $levelRecord->symbol,
                        ]);
                    }
                }
            }
        } catch (\Throwable $e) {
            $this->warn("Failed to check user symbol levels for SMS/notifications: " . $e->getMessage());
        }

        try {
            $portfolioSmsCount = SendPortfolioDailySms::sendDailyPortfolioSms();
            $smsCount += $portfolioSmsCount;
        } catch (\Throwable $e) {
            $this->warn("Failed to send portfolio daily SMS: " . $e->getMessage());
        }

        try {
            \App\Models\User::query()->update(['is_stale' => false]);
        } catch (\Throwable $e) {
            $this->warn("Failed to update stale flags: " . $e->getMessage());
        }

        try {
            \App\Models\SystemSetting::set('last_refresh_at', now()->utc()->toIso8601String());
        } catch (\Throwable $e) {
            $this->warn("Failed to save last_refresh_at: " . $e->getMessage());
        }

        try {
            \App\Models\CrossoverNotification::cleanup(7);
        } catch (\Throwable $e) {
            $this->warn("Failed to cleanup crossover notifications: " . $e->getMessage());
        }

        $this->info($updated . ' آیتم پورتفولیو بروزرسانی شد.' . ($errors ? " ($errors خطا)" : '') . ($smsCount ? " | $smsCount SMS ارسال شد." : '') . ($crossoverCount ? " | $crossoverCount کراس تشخیص داده شد." : ''));
    }
}
