<?php

namespace App\Services;

use App\Models\CrossoverNotification;
use App\Models\PortfolioItem;
use App\Models\UserSymbolLevel;
use Illuminate\Support\Facades\Log;

class CrossoverDetectionService
{
    private array $levels = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];

    public function checkPortfolioItem(PortfolioItem $item, float $newPrice): array
    {
        $detected = [];

        if (!$item->portfolio || !$item->portfolio->user) {
            return $detected;
        }

        $user = $item->portfolio->user;
        $oldPrice = $item->getOriginal('last_price');

        foreach ($this->levels as $level) {
            $levelValue = $item->{$level};

            if ($levelValue === null || $levelValue <= 0) {
                continue;
            }

            $levelValue = (float) $levelValue;

            $crossDirection = $this->detectCrossing($level, $newPrice, $levelValue);

            if (!$crossDirection) {
                continue;
            }

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

            Log::info('Crossover detected', [
                'user_id' => $user->id,
                'symbol' => $item->symbol,
                'level' => $level,
                'direction' => $crossDirection,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'level_value' => $levelValue,
            ]);
        }

        return $detected;
    }

    public function checkSymbolLevel(UserSymbolLevel $levelRecord, float $newPrice, ?float $oldPrice = null): array
    {
        $detected = [];

        $user = $levelRecord->user;

        if (!$user) {
            return $detected;
        }

        if ($oldPrice === null) {
            $cached = \Illuminate\Support\Facades\DB::table('symbols_cache')
                ->where('symbol', $levelRecord->symbol)
                ->first();
            $oldPrice = $cached ? (float) $cached->last_price : null;
        }

        if ($oldPrice === null) {
            return $detected;
        }

        if ($oldPrice == $newPrice) {
            return $detected;
        }

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

            Log::info('Crossover detected (symbol level)', [
                'user_id' => $user->id,
                'symbol' => $levelRecord->symbol,
                'level' => $level,
                'direction' => $crossDirection,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'level_value' => $levelValue,
            ]);
        }

        return $detected;
    }

    private function detectCrossing(string $level, float $newPrice, float $levelValue): ?string
    {
        $isResistance = str_starts_with($level, 'resistance');

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
}
