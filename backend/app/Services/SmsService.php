<?php

namespace App\Services;

use App\Models\PortfolioItem;
use App\Models\SmsNotification;
use App\Models\User;
use App\Models\UserSymbolLevel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Ippanel\Client as IPPanelClient;

class SmsService
{
    private int $defaultCooldown;
    private array $levels = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];

    public function __construct(?int $defaultCooldown = null)
    {
        $this->defaultCooldown = $defaultCooldown
            ?? (int) (\App\Models\SystemSetting::get('sms_cooldown_minutes', '60'));
    }

    /**
     * Check all levels for a portfolio item and send SMS if needed.
     */
    public function checkAndNotify(PortfolioItem $item, float $newPrice): array
    {
        $sent = [];

        if (!$item->portfolio || !$item->portfolio->user) {
            return $sent;
        }

        if ($item->sms_enabled === false) {
            return $sent;
        }

        $user = $item->portfolio->user;

        if (!$user->hasSmsConfigured()) {
            return $sent;
        }

        $scope = $user->sms_scope ?? 'portfolio';
        if ($scope === 'all') {
            return $sent;
        }

        if (!$this->isInSmsTimeRange($user)) {
            return $sent;
        }

        $cooldownMinutes = $user->sms_cooldown_minutes ?? $this->defaultCooldown;

        $oldPrice = $item->getOriginal('last_price');

        if ($oldPrice === null) {
            return $sent;
        }

        $oldPrice = (float) $oldPrice;

        foreach ($this->levels as $level) {
            $levelValue = $item->{$level};

            if ($levelValue === null || $levelValue <= 0) {
                continue;
            }

            $levelValue = (float) $levelValue;

            $crossed = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

            if (!$crossed) {
                continue;
            }

            if (!SmsNotification::canSend($item->id, $level, $cooldownMinutes)) {
                continue;
            }

            $result = $this->sendSms($user, $item->symbol, $level, $levelValue, $newPrice);

            if ($result) {
                SmsNotification::record($user->id, $item->id, $level, $newPrice, $item->symbol);
                $sent[] = ['level' => $level, 'price' => $newPrice];
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

        $scope = $user->sms_scope ?? 'portfolio';
        if ($scope === 'portfolio') {
            return $sent;
        }

        if (!$this->isInSmsTimeRange($user)) {
            return $sent;
        }

        $cooldownMinutes = $user->sms_cooldown_minutes ?? $this->defaultCooldown;

        $levelRecord = UserSymbolLevel::where('user_id', $user->id)
            ->where('symbol', $symbol)
            ->first();

        if (!$levelRecord || !$levelRecord->hasAnyLevel()) {
            return $sent;
        }

        if ($levelRecord->sms_enabled === false) {
            return $sent;
        }

        if ($oldPrice === null) {
            $oldPrice = $this->getOldSymbolPrice($symbol);
        }

        if ($oldPrice === null) {
            return $sent;
        }

        foreach ($this->levels as $level) {
            $levelValue = $levelRecord->{$level};

            if ($levelValue === null || $levelValue <= 0) {
                continue;
            }

            $levelValue = (float) $levelValue;

            $crossed = $this->detectCrossing($level, $oldPrice, $newPrice, $levelValue);

            if (!$crossed) {
                continue;
            }

            $fakeItemId = -abs(crc32($symbol . $level));

            if (!SmsNotification::canSend($fakeItemId, $level, $cooldownMinutes)) {
                continue;
            }

            $result = $this->sendSms($user, $symbol, $level, $levelValue, $newPrice);

            if ($result) {
                SmsNotification::record($user->id, $fakeItemId, $level, $newPrice, $symbol);
                $sent[] = ['level' => $level, 'price' => $newPrice];
            }
        }

        return $sent;
    }

    private function getOldSymbolPrice(string $symbol): ?float
    {
        $cached = \App\Models\SymbolsCache::where('symbol', $symbol)->first();
        return $cached ? (float) $cached->last_price : null;
    }

    /**
     * Detect if the price crossed a support/resistance level
     */
    private function detectCrossing(string $level, float $oldPrice, float $newPrice, float $levelValue): bool
    {
        $isResistance = str_starts_with($level, 'resistance');

        if ($isResistance) {
            return $oldPrice < $levelValue && $newPrice >= $levelValue;
        } else {
            return $oldPrice > $levelValue && $newPrice <= $levelValue;
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
            $direction = str_starts_with($level, 'resistance') ? 'مقاومت' : 'حمایت';
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

    private function isInSmsTimeRange(User $user): bool
    {
        if (empty($user->sms_start_time) || empty($user->sms_end_time)) {
            return true;
        }

        $start = substr((string) $user->sms_start_time, 0, 5);
        $end = substr((string) $user->sms_end_time, 0, 5);
        $now = Carbon::now('Asia/Tehran')->format('H:i');

        if ($start <= $end) {
            return $now >= $start && $now <= $end;
        }

        return $now >= $start || $now <= $end;
    }

    private function getLevelLabel(string $level): string
    {
        return match ($level) {
            'resistance_1' => '۱',
            'resistance_2' => '۲',
            'support_1' => '۱',
            'support_2' => '۲',
            default => $level,
        };
    }
}
