<?php

namespace App\Services;

use App\Models\PortfolioItem;
use App\Models\SmsNotification;
use App\Models\User;
use App\Models\UserSymbolLevel;
use Illuminate\Support\Facades\Log;
use Ippanel\Client as IPPanelClient;

class SmsService
{
    private array $levels = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];

    /**
     * Check all levels for a portfolio item and send SMS if needed.
     */
    public function checkAndNotify(PortfolioItem $item, float $newPrice): array
    {
        $sent = [];

        if (!$item->portfolio || !$item->portfolio->user) {
            return $sent;
        }

        $user = $item->portfolio->user;

        if (!$user->hasSmsConfigured()) {
            return $sent;
        }

        $oldPrice = $item->getOriginal('last_price');

        if ($oldPrice === null) {
            return $sent;
        }

        $oldPrice = (float) $oldPrice;

        if (!$this->cooldownPassed($user->id, $item->symbol, $user->sms_cooldown_minutes ?? 60)) {
            return $sent;
        }

        foreach ($this->levels as $level) {
            try {
                $levelValue = $item->{$level};

                if ($levelValue === null || $levelValue <= 0) {
                    continue;
                }

                $levelValue = (float) $levelValue;

                $countField = 'sms_' . $level . '_count';
                $maxSend = $item->{$countField} ?? 0;

                if ($maxSend <= 0) {
                    continue;
                }

                $crossed = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

                if (!$crossed) {
                    continue;
                }

                $alreadySent = SmsNotification::where('user_id', $user->id)
                    ->where('symbol', $item->symbol)
                    ->where('level_type', $level)
                    ->count();

                if ($alreadySent >= $maxSend) {
                    continue;
                }

                $result = $this->sendSms($user, $item->symbol, $level, $levelValue, $newPrice);

                if ($result) {
                    try {
                        SmsNotification::record($user->id, $item->symbol, $level, $newPrice);
                    } catch (\Throwable $e) {
                        Log::error('SmsNotification record failed', [
                            'user_id' => $user->id,
                            'symbol' => $item->symbol,
                            'level' => $level,
                            'error' => $e->getMessage(),
                        ]);
                    }
                    $sent[] = ['level' => $level, 'price' => $newPrice];
                }
            } catch (\Throwable $e) {
                Log::error('SMS level check failed', [
                    'user_id' => $user->id,
                    'symbol' => $item->symbol,
                    'level' => $level,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }

    /**
     * Check user_symbol_levels for a symbol and send SMS if needed.
     */
    public function checkAndNotifySymbolLevel(User $user, string $symbol, float $newPrice, ?float $oldPrice = null): array
    {
        $sent = [];

        if (!$user->hasSmsConfigured()) {
            return $sent;
        }

        $levelRecord = UserSymbolLevel::where('user_id', $user->id)
            ->where('symbol', $symbol)
            ->first();

        if (!$levelRecord || !$levelRecord->hasAnyLevel()) {
            return $sent;
        }

        if (!$levelRecord->hasAnySmsEnabled()) {
            return $sent;
        }

        if (!$this->cooldownPassed($user->id, $symbol, $levelRecord->sms_cooldown_minutes ?? 60)) {
            return $sent;
        }

        if ($oldPrice === null) {
            $oldPrice = $this->getOldSymbolPrice($symbol);
        }

        if ($oldPrice === null) {
            return $sent;
        }

        foreach ($this->levels as $level) {
            try {
                $levelValue = $levelRecord->{$level};

                if ($levelValue === null || $levelValue <= 0) {
                    continue;
                }

                $levelValue = (float) $levelValue;

                $countField = 'sms_' . $level . '_count';
                $maxSend = $levelRecord->{$countField} ?? 0;

                if ($maxSend <= 0) {
                    continue;
                }

                $crossed = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

                if (!$crossed) {
                    continue;
                }

                $alreadySent = SmsNotification::where('user_id', $user->id)
                    ->where('symbol', $symbol)
                    ->where('level_type', $level)
                    ->count();

                if ($alreadySent >= $maxSend) {
                    continue;
                }

                $result = $this->sendSms($user, $symbol, $level, $levelValue, $newPrice);

                if ($result) {
                    try {
                        SmsNotification::record($user->id, $symbol, $level, $newPrice);
                    } catch (\Throwable $e) {
                        Log::error('SmsNotification record failed (symbol level)', [
                            'user_id' => $user->id,
                            'symbol' => $symbol,
                            'level' => $level,
                            'error' => $e->getMessage(),
                        ]);
                    }
                    $sent[] = ['level' => $level, 'price' => $newPrice];
                }
            } catch (\Throwable $e) {
                Log::error('SMS symbol level check failed', [
                    'user_id' => $user->id,
                    'symbol' => $symbol,
                    'level' => $level,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }

    private function getOldSymbolPrice(string $symbol): ?float
    {
        $cached = \Illuminate\Support\Facades\DB::table('symbols_cache')->where('symbol', $symbol)->first();
        return $cached ? (float) $cached->last_price : null;
    }

    /**
     * Check if cooldown has passed since last SMS for this user+symbol (any level)
     */
    private function cooldownPassed(int $userId, string $symbol, int $cooldownMinutes): bool
    {
        $lastSent = SmsNotification::where('user_id', $userId)
            ->where('symbol', $symbol)
            ->latest('sent_at')
            ->value('sent_at');

        if (!$lastSent) {
            return true;
        }

        return now()->diffInMinutes($lastSent) >= $cooldownMinutes;
    }

    /**
     * Detect if the price crossed a support/resistance level
     */
    private function detectCrossing(string $level, float $oldPrice, float $newPrice, float $levelValue): bool
    {
        $isResistance = substr($level, 0, 10) === 'resistance';

        if ($isResistance) {
            return $newPrice >= $levelValue;
        } else {
            return $newPrice <= $levelValue;
        }
    }

    /**
     * Send SMS via IPPanel
     */
    private function sendSms(User $user, string $symbol, string $level, float $levelValue, float $currentPrice): bool
    {
        try {
            $client = new IPPanelClient($user->ippanel_api_key);

            $levelLabel = $this->getLevelLabel($level);
            $direction = substr($level, 0, 10) === 'resistance' ? 'مقاومت' : 'حمایت';
            $priceFormat = number_format($currentPrice);
            $levelFormat = number_format($levelValue);

            $message = "{$symbol} به {$direction} {$levelLabel} رسید\n"
                . "فعلی: {$priceFormat}\n"
                . "{$direction}: {$levelFormat}";

            $response = $client->sendWebservice(
                $message,
                $user->ippanel_sender,
                [$user->phone]
            );

            if ($response->isSuccessful()) {
                Log::info('SMS sent successfully', [
                    'user_id' => $user->id,
                    'symbol' => $symbol,
                    'level' => $level,
                ]);
                return true;
            }

            Log::warning('SMS send failed', [
                'user_id' => $user->id,
                'symbol' => $symbol,
                'message' => $response->getMessage(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('SMS send error', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    private function getLevelLabel(string $level): string
    {
        $labels = [
            'resistance_1' => '۱',
            'resistance_2' => '۲',
            'support_1' => '۱',
            'support_2' => '۲',
        ];
        return $labels[$level] ?? $level;
    }
}
