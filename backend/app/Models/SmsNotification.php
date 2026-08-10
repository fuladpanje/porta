<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsNotification extends Model
{
    protected $fillable = [
        'user_id',
        'portfolio_item_id',
        'symbol',
        'level_type',
        'price_at_trigger',
        'sent_at',
    ];

    protected $casts = [
        'price_at_trigger' => 'decimal:2',
        'sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function portfolioItem(): BelongsTo
    {
        return $this->belongsTo(PortfolioItem::class);
    }

    /**
     * Check if cooldown has passed for this user+symbol+level
     */
    public static function canSend(int $userId, string $symbol, string $levelType, int $cooldownMinutes = 60): bool
    {
        $lastSent = static::where('user_id', $userId)
            ->where('symbol', $symbol)
            ->where('level_type', $levelType)
            ->latest('sent_at')
            ->value('sent_at');

        if (!$lastSent) {
            return true;
        }

        return now()->diffInMinutes($lastSent) >= $cooldownMinutes;
    }

    /**
     * Record that SMS was sent
     */
    public static function record(int $userId, ?string $symbol, string $levelType, float $price): static
    {
        return static::create([
            'user_id' => $userId,
            'portfolio_item_id' => null,
            'symbol' => $symbol,
            'level_type' => $levelType,
            'price_at_trigger' => $price,
            'sent_at' => now(),
        ]);
    }
}
