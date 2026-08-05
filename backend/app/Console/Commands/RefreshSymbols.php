<?php

namespace App\Console\Commands;

use App\Models\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class RefreshSymbols extends Command
{
    protected $signature = 'symbols:refresh';
    protected $description = 'بروزرسانی خودکار نمادها از BRS API و ذخیره در دیتابیس';

    public function handle(): int
    {
        $this->info('شروع بروزرسانی نمادها...');

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

        $this->saveSymbolsToDatabase($symbols);

        $this->updatePortfolioPrices($symbols);

        $this->info('بروزرسانی نمادها با موفقیت انجام شد.');
        return 0;
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

    private function saveSymbolsToDatabase(array $symbols): void
    {
        $now = now();
        $batch = [];

        foreach ($symbols as $symbol) {
            $isin = $symbol['isin'] ?? '';
            if (empty($isin)) continue;

            $batch[] = [
                'isin' => $isin,
                'symbol' => $symbol['l18'] ?? $symbol['l30'] ?? '',
                'full_name' => $symbol['l30'] ?? '',
                'last_price' => is_numeric($symbol['pl'] ?? null) ? $symbol['pl'] : null,
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
        }

        $chunks = array_chunk($batch, 500);
        foreach ($chunks as $chunk) {
            foreach ($chunk as $row) {
                DB::table('symbols_cache')->updateOrInsert(
                    ['isin' => $row['isin']],
                    $row
                );
            }
        }

        $this->info(count($batch) . ' نماد در دیتابیس ذخیره شد.');
    }

    private function updatePortfolioPrices(array $symbols): void
    {
        @set_time_limit(120);

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
        $errors = 0;
        $smsCount = 0;

        \Illuminate\Support\Facades\DB::statement('SET SESSION innodb_lock_wait_timeout = 5');

        $smsService = new \App\Services\SmsService();
        $portfolios = \App\Models\Portfolio::with('items', 'user')->get();
        foreach ($portfolios as $portfolio) {
            foreach ($portfolio->items as $item) {
                $key = strtolower($item->symbol);

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

                            // SMS notification check
                            if ($pl !== null && !empty($updateData['last_price'])) {
                                try {
                                    $item->loadMissing('portfolio.user');
                                    $sent = $smsService->checkAndNotify($item, (float) $pl);
                                    $smsCount += count($sent);
                                } catch (\Throwable $e) {
                                    $this->warn("SMS check failed for {$item->symbol}: " . $e->getMessage());
                                }
                            }
                        } catch (\Throwable $e) {
                            $errors++;
                            $this->warn("Failed to update item {$item->id} ({$item->symbol}): " . $e->getMessage());
                        }
                    }
                }
            }
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

        $this->info($updated . ' آیتم پورتفولیو بروزرسانی شد.' . ($errors ? " ($errors خطا)" : '') . ($smsCount ? " | $smsCount SMS ارسال شد." : ''));
    }
}
