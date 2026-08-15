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

    private static ?bool $tableExists = null;

    private function isTableReady(): bool
    {
        if (self::$tableExists === null) {
            self::$tableExists = Schema::hasTable('crossover_notifications');
        }
        return self::$tableExists;
    }

    public function checkPortfolioItem(PortfolioItem $item, float $newPrice, ?float $oldPrice = null): array
    {
        $detected = [];

        if (!$this->isTableReady()) {
            return $detected;
        }

        if (!$item->portfolio || !$item->portfolio->user) {
            return $detected;
        }

        $user = $item->portfolio->user;
        if ($oldPrice === null) {
            $oldPrice = (float) ($item->getOriginal('last_price') ?? $item->last_price ?? 0);
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
                continue;
            }

            if ($this->isWithinCooldown($user->id, $item->symbol, $level, $cooldownMinutes)) {
                continue;
            }

            if (!$this->isMarketOpen()) {
                Log::info("CROSS SKIP: {$item->symbol} {$level} - market closed");
                continue;
            }

            Log::info("CROSS DETECTED: {$item->symbol} {$level} old={$oldPrice} new={$newPrice} level={$levelValue} dir={$crossDirection}");

            try {
                $notification = CrossoverNotification::create([
                    'user_id' => $user->id,
                    'symbol' => $item->symbol,
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                    'source' => $item->portfolio->name ?? null,
                    'detected_at' => now(),
                ]);

                $detected[] = [
                    'id' => $notification->id,
                    'symbol' => $item->symbol,
                    'source' => $item->portfolio->name ?? null,
                    'level' => $level,
                    'level_value' => $levelValue,
                    'price' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                ];
            } catch (\Throwable $e) {
                Log::error('CrossoverNotification create failed: ' . $e->getMessage());
            }
        }

        return $detected;
    }

    public function checkSymbolLevel(UserSymbolLevel $levelRecord, float $newPrice, ?float $oldPrice = null): array
    {
        $detected = [];

        if (!$this->isTableReady()) {
            return $detected;
        }

        $user = $levelRecord->user;

        if (!$user) {
            return $detected;
        }

        if ($oldPrice === null) {
            try {
                $cached = DB::table('symbols_cache')
                    ->where('symbol', $levelRecord->symbol)
                    ->first();
                $oldPrice = $cached ? (float) $cached->last_price : null;
            } catch (\Throwable $e) {
                return $detected;
            }
        }

        if ($oldPrice === null) {
            return $detected;
        }

        if ($oldPrice == $newPrice) {
            return $detected;
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
                continue;
            }

            if ($this->isWithinCooldown($user->id, $levelRecord->symbol, $level, $cooldownMinutes)) {
                continue;
            }

            if (!$this->isMarketOpen()) {
                continue;
            }

            try {
                $notification = CrossoverNotification::create([
                    'user_id' => $user->id,
                    'symbol' => $levelRecord->symbol,
                    'level_type' => $level,
                    'level_value' => $levelValue,
                    'price_at_trigger' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                    'detected_at' => now(),
                ]);

                $detected[] = [
                    'id' => $notification->id,
                    'symbol' => $levelRecord->symbol,
                    'level' => $level,
                    'level_value' => $levelValue,
                    'price' => $newPrice,
                    'old_price' => $oldPrice,
                    'direction' => $crossDirection,
                ];
            } catch (\Throwable $e) {
                Log::error('CrossoverNotification create failed (symbol level): ' . $e->getMessage());
            }
        }

        return $detected;
    }

    private function detectCrossing(string $level, float $oldPrice, float $newPrice, float $levelValue): ?string
    {
        $isResistance = substr($level, 0, 10) === 'resistance';

        if ($isResistance) {
            if ($oldPrice < $levelValue && $newPrice >= $levelValue) {
                return 'up';
            }
        } else {
            if ($oldPrice > $levelValue && $newPrice <= $levelValue) {
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
                ->latest()
                ->first();

            if ($lastNotification) {
                $diffSeconds = $lastNotification->created_at->diffInSeconds(now());
                $cooldownSeconds = $cooldownMinutes * 60;
                $within = $diffSeconds < $cooldownSeconds;
                Log::info("COOLDOWN: {$symbol} {$levelType} last={$lastNotification->created_at} diff={$diffSeconds}s cooldown={$cooldownSeconds}s within={$within}");
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
        $now = now()->format('H:i');
        return $start <= $end
            ? ($now >= $start && $now <= $end)
            : ($now >= $start || $now <= $end);
    }
}
