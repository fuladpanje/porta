<?php

namespace App\Services;

use App\Models\CrossoverNotification;
use App\Models\PortfolioItem;
use App\Models\SystemSetting;
use App\Models\UserSymbolLevel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class CrossoverDetectionService
{
    private array $levels = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];

    private function debugLog(string $message, array $context = []): void
    {
        try {
            $line = '[' . now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s') . '] [CROSSOVER] ' . $message;
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

    private function isTableReady(): bool
    {
        try {
            return Schema::hasTable('crossover_notifications');
        } catch (\Throwable $e) {
            $this->debugLog('Table check failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function checkPortfolioItem(PortfolioItem $item, float $newPrice, ?float $oldPrice = null, bool $force = false): array
    {
        $detected = [];

        if (!$this->isTableReady()) {
            $this->debugLog('Skipped: crossover_notifications table is not available');
            return $detected;
        }

        if (!$item->portfolio || !$item->portfolio->user) {
            $this->debugLog('Skipped: portfolio or user is missing', ['symbol' => $item->symbol, 'item_id' => $item->id]);
            return $detected;
        }

        $user = $item->portfolio->user;
        if ($oldPrice === null) {
            // اولویت: prev_last_price پایدار در DB (هاست اشتراکی) -> سپس getOriginal
            $rawOldPrice = null;
            try {
                if (Schema::hasColumn('portfolio_items', 'prev_last_price') && isset($item->prev_last_price) && $item->prev_last_price !== null) {
                    $rawOldPrice = $item->prev_last_price;
                }
            } catch (\Throwable $e) {}
            if ($rawOldPrice === null) {
                $rawOldPrice = $item->getOriginal('last_price') ?? $item->last_price;
            }
            if ($rawOldPrice === null || (float) $rawOldPrice <= 0) {
                $this->debugLog('Skipped portfolio crossover: no valid previous price', [
                    'user_id' => $user->id,
                    'item_id' => $item->id,
                    'symbol' => $item->symbol,
                    'new_price' => $newPrice,
                ]);
                return $detected;
            }
            $oldPrice = (float) $rawOldPrice;
        }
        // اگر به خاطر race قیمت قبلی همان فعلی شده، از prev_last_price پایدار استفاده کن
        if ($oldPrice == $newPrice) {
            try {
                if (Schema::hasColumn('portfolio_items', 'prev_last_price') && isset($item->prev_last_price) && $item->prev_last_price !== null && (float)$item->prev_last_price != $newPrice && (float)$item->prev_last_price > 0) {
                    $oldPrice = (float) $item->prev_last_price;
                    $this->debugLog('Corrected oldPrice from prev_last_price (race)', [
                        'symbol' => $item->symbol,
                        'old' => $oldPrice,
                        'new' => $newPrice,
                    ]);
                }
            } catch (\Throwable $e) {}
        }

        // وقتی oldPrice==newPrice شد، مدل Eloquent از قبل بارگذاری شده و ممکن است stale باشد
        // مستقیماً از DB می‌خوانیم تا مقدار واقعی prev_last_price را داشته باشیم
        if ($oldPrice == $newPrice) {
            try {
                $freshItem = \App\Models\PortfolioItem::find($item->id);
                if ($freshItem && Schema::hasColumn('portfolio_items', 'prev_last_price') && $freshItem->prev_last_price !== null && (float)$freshItem->prev_last_price != $newPrice && (float)$freshItem->prev_last_price > 0) {
                    $oldPrice = (float) $freshItem->prev_last_price;
                    $this->debugLog('Corrected oldPrice from fresh DB prev_last_price', [
                        'symbol' => $item->symbol,
                        'old' => $oldPrice,
                        'new' => $newPrice,
                    ]);
                }
            } catch (\Throwable $e) {}
        }

        $cooldownMinutes = $item->notification_cooldown_minutes ?? 10;

        foreach ($this->levels as $level) {
            $levelValue = $item->{$level};

            if ($levelValue === null || $levelValue <= 0) {
                continue;
            }

            $levelValue = (float) $levelValue;

            $crossDirection = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

            if (!$crossDirection) {
                if (abs($newPrice - $levelValue) < 200 || abs($oldPrice - $levelValue) < 200) {
                    $this->debugLog('No cross (portfolio)', [
                        'symbol' => $item->symbol,
                        'level' => $level,
                        'old' => $oldPrice,
                        'new' => $newPrice,
                        'level_value' => $levelValue,
                    ]);
                }
                continue;
            }

            if ($this->isWithinCooldown($user->id, $item->symbol, $level, $cooldownMinutes)) {
                $this->debugLog('Skipped: cooldown', [
                    'symbol' => $item->symbol,
                    'level' => $level,
                    'old' => $oldPrice,
                    'new' => $newPrice,
                    'level_value' => $levelValue,
                ]);
                continue;
            }

            Log::info("CROSS DETECTED: {$item->symbol} {$level} old={$oldPrice} new={$newPrice} level={$levelValue} dir={$crossDirection}");
            $this->debugLog('Detected crossover', [
                'user_id' => $user->id,
                'symbol' => $item->symbol,
                'level' => $level,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'level_value' => $levelValue,
                'direction' => $crossDirection,
            ]);

            // ستون symbol فقط ۲۰ کاراکتر است؛ MySQL سخت‌گیر هاست اشتراکی رشته بلند را رد
            // می‌کند (لوکال فقط truncate می‌کند). مثل test-notification کوتاه می‌کنیم.
            $safeSymbol = mb_substr((string) $item->symbol, 0, 20);
            $safeSource = $item->portfolio->name ?? null;
            if ($safeSource !== null) {
                $safeSource = mb_substr((string) $safeSource, 0, 255);
            }
            try {
                $notification = CrossoverNotification::create([
                    'user_id' => $user->id,
                    'symbol' => $safeSymbol,
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                    'source' => $safeSource,
                    'detected_at' => now()->timezone('Asia/Tehran'),
                ]);

                $detected[] = [
                    'id' => $notification->id,
                    'symbol' => $safeSymbol,
                    'source' => $safeSource,
                    'level' => $level,
                    'level_value' => $levelValue,
                    'price' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                ];
            } catch (\Throwable $e) {
                Log::error('CrossoverNotification create failed: ' . $e->getMessage());
                $this->debugLog('CREATE FAILED', [
                    'user_id' => $user->id,
                    'symbol' => $item->symbol,
                    'level' => $level,
                    'error' => $e->getMessage(),
                ]);
                // فال‌بک خام مثل test-notification که روی همین هاست جواب داده
                try {
                    $nowStr = now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s');
                    $rawData = [
                        'user_id' => $user->id,
                        'symbol' => $safeSymbol,
                        'level_type' => $level,
                        'level_value' => $levelValue,
                        'price_at_trigger' => $newPrice,
                        'old_price' => $oldPrice,
                        'direction' => $crossDirection,
                        'detected_at' => $nowStr,
                        'created_at' => $nowStr,
                        'updated_at' => $nowStr,
                    ];
                    if (Schema::hasColumn('crossover_notifications', 'source')) {
                        $rawData['source'] = $safeSource;
                    }
                    $rawId = DB::table('crossover_notifications')->insertGetId($rawData);
                    $detected[] = [
                        'id' => $rawId,
                        'symbol' => $safeSymbol,
                        'source' => $safeSource,
                        'level' => $level,
                        'level_value' => $levelValue,
                        'price' => $newPrice,
                        'old_price' => $oldPrice,
                        'direction' => $crossDirection,
                    ];
                    $this->debugLog('Created crossover via raw fallback', [
                        'id' => $rawId,
                        'symbol' => $safeSymbol,
                        'level' => $level,
                    ]);
                } catch (\Throwable $e2) {
                    $this->debugLog('CREATE FAILED (raw fallback too)', [
                        'user_id' => $user->id,
                        'symbol' => $item->symbol,
                        'level' => $level,
                        'error' => $e2->getMessage(),
                    ]);
                }
            }
        }

        return $detected;
    }

    public function checkSymbolLevel(UserSymbolLevel $levelRecord, float $newPrice, ?float $oldPrice = null, bool $force = false): array
    {
        $detected = [];

        if (!$this->isTableReady()) {
            $this->debugLog('Skipped symbol level: crossover_notifications table is not available');
            return $detected;
        }

        $user = $levelRecord->user;

        if (!$user) {
            $this->debugLog('Skipped symbol level: user is missing', ['symbol' => $levelRecord->symbol, 'level_id' => $levelRecord->id]);
            return $detected;
        }

        if ($oldPrice === null) {
            try {
                $cached = DB::table('symbols_cache')
                    ->where('symbol', $levelRecord->symbol)
                    ->first();
                if ($cached) {
                    // اولویت prev_last_price پایدار (هاست اشتراکی)
                    if (isset($cached->prev_last_price) && $cached->prev_last_price !== null && (float)$cached->prev_last_price > 0) {
                        $oldPrice = (float) $cached->prev_last_price;
                        // اگر prev همان new است (قیمت ثابت)، از last_price استفاده کن
                        if ($oldPrice == $newPrice && $cached->last_price !== null) {
                            $oldPrice = (float) $cached->last_price;
                        }
                    } else {
                        $oldPrice = $cached->last_price !== null ? (float) $cached->last_price : null;
                    }
                }
            } catch (\Throwable $e) {
                return $detected;
            }
        }

        if ($oldPrice === null) {
            $this->debugLog('Skipped symbol-level crossover: no previous cache price', [
                'user_id' => $user->id,
                'level_id' => $levelRecord->id,
                'symbol' => $levelRecord->symbol,
                'new_price' => $newPrice,
            ]);
            return $detected;
        }

        // اگر به خاطر race قیمت قبلی همان فعلی شده، از prev_last_price استفاده کن
        if ($oldPrice !== null && $oldPrice == $newPrice) {
            try {
                $cached2 = DB::table('symbols_cache')->where('symbol', $levelRecord->symbol)->first();
                if ($cached2 && isset($cached2->prev_last_price) && $cached2->prev_last_price !== null && (float)$cached2->prev_last_price != $newPrice && (float)$cached2->prev_last_price > 0) {
                    $oldPrice = (float) $cached2->prev_last_price;
                    $this->debugLog('Corrected oldPrice from prev_last_price (symbol_level race)', [
                        'symbol' => $levelRecord->symbol,
                        'old' => $oldPrice,
                        'new' => $newPrice,
                    ]);
                }
            } catch (\Throwable $e) {}
        }
        $cooldownMinutes = $levelRecord->notification_cooldown_minutes ?? 10;

        foreach ($this->levels as $level) {
            $levelValue = $levelRecord->{$level};

            if ($levelValue === null || $levelValue <= 0) {
                continue;
            }

            $levelValue = (float) $levelValue;

            $crossDirection = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

            if (!$crossDirection) {
                if (abs($newPrice - $levelValue) < 200 || abs($oldPrice - $levelValue) < 200) {
                    $this->debugLog('No cross (symbol_level)', [
                        'symbol' => $levelRecord->symbol,
                        'level' => $level,
                        'old' => $oldPrice,
                        'new' => $newPrice,
                        'level_value' => $levelValue,
                    ]);
                }
                continue;
            }

            if ($this->isWithinCooldown($user->id, $levelRecord->symbol, $level, $cooldownMinutes)) {
                $this->debugLog('Skipped: cooldown (symbol_level)', [
                    'symbol' => $levelRecord->symbol,
                    'level' => $level,
                    'old' => $oldPrice,
                    'new' => $newPrice,
                    'level_value' => $levelValue,
                ]);
                continue;
            }

            $safeSymbol = mb_substr((string) $levelRecord->symbol, 0, 20);
            try {
                $notification = CrossoverNotification::create([
                    'user_id' => $user->id,
                    'symbol' => $safeSymbol,
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                    'detected_at' => now()->timezone('Asia/Tehran'),
                ]);

                $detected[] = [
                    'id' => $notification->id,
                    'symbol' => $safeSymbol,
                    'level' => $level,
                    'level_value' => $levelValue,
                    'price' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                ];
            } catch (\Throwable $e) {
                Log::error('CrossoverNotification create failed (symbol level): ' . $e->getMessage());
                $this->debugLog('CREATE FAILED (symbol level)', [
                    'user_id' => $user->id,
                    'symbol' => $levelRecord->symbol,
                    'level' => $level,
                    'error' => $e->getMessage(),
                ]);
                try {
                    $nowStr = now()->timezone('Asia/Tehran')->format('Y-m-d H:i:s');
                    $rawId = DB::table('crossover_notifications')->insertGetId([
                        'user_id' => $user->id,
                        'symbol' => $safeSymbol,
                        'level_type' => $level,
                        'level_value' => $levelValue,
                        'price_at_trigger' => $newPrice,
                        'old_price' => $oldPrice,
                        'direction' => $crossDirection,
                        'detected_at' => $nowStr,
                        'created_at' => $nowStr,
                        'updated_at' => $nowStr,
                    ]);
                    $detected[] = [
                        'id' => $rawId,
                        'symbol' => $safeSymbol,
                        'level' => $level,
                        'level_value' => $levelValue,
                        'price' => $newPrice,
                        'old_price' => $oldPrice,
                        'direction' => $crossDirection,
                    ];
                    $this->debugLog('Created crossover (symbol level) via raw fallback', [
                        'id' => $rawId,
                        'symbol' => $safeSymbol,
                        'level' => $level,
                    ]);
                } catch (\Throwable $e2) {
                    $this->debugLog('CREATE FAILED (symbol level raw fallback too)', [
                        'user_id' => $user->id,
                        'symbol' => $levelRecord->symbol,
                        'level' => $level,
                        'error' => $e2->getMessage(),
                    ]);
                }
            }
        }

        return $detected;
    }

    private function detectCrossing(string $level, float $oldPrice, float $newPrice, float $levelValue): ?string
    {
        // یکسان با SmsService::detectCrossing (state-based، نه edge):
        // مقاومت رد شده یعنی قیمت فعلی بالای سطح است، حمایت یعنی پایین سطح.
        // oldPrice عمداً نادیده گرفته می‌شود تا رفتار SMS و نوتیفیکیشن سایت یکی باشد
        // و race هاست اشتراکی (old==new) دیگر مانع تشخیص نشود.
        $isResistance = substr($level, 0, 10) === 'resistance';

        if ($isResistance) {
            if ($newPrice >= $levelValue) {
                return 'up';
            }
        } else {
            if ($newPrice <= $levelValue) {
                return 'down';
            }
        }

        return null;
    }

    private function isWithinCooldown(int $userId, string $symbol, string $levelType, int $cooldownMinutes): bool
    {
        try {
            $lastNotification = CrossoverNotification::where('user_id', $userId)
                ->where('symbol', $symbol)
                ->where('level_type', $levelType)
                ->orderByDesc('detected_at')
                ->first();

            if ($lastNotification) {
                // استفاده از detected_at به جای created_at برای مقاومت در برابر اختلاف timezone
                $lastTime = $lastNotification->detected_at ?? $lastNotification->created_at;
                $diffSeconds = $lastTime->diffInSeconds(now());
                $cooldownSeconds = $cooldownMinutes * 60;
                $within = $diffSeconds < $cooldownSeconds;
                Log::info("COOLDOWN: {$symbol} {$levelType} last={$lastTime} diff={$diffSeconds}s cooldown={$cooldownSeconds}s within={$within}");
                return $within;
            }
        } catch (\Throwable $e) {
            Log::error('Cooldown check failed: ' . $e->getMessage());
        }

        return false;
    }

    private function isMarketOpen(): bool
    {
        $schedule = SystemSetting::getSchedule();
        if (!$schedule['enabled']) {
            return true;
        }
        $start = $schedule['start_time'];
        $end = $schedule['end_time'];
        if (!$start || !$end) {
            return true;
        }
        $now = now()->timezone('Asia/Tehran')->format('H:i');
        return $start <= $end
            ? ($now >= $start && $now <= $end)
            : ($now >= $start || $now <= $end);
    }
}
