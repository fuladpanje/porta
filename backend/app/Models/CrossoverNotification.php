<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrossoverNotification extends Model
{
    protected $fillable = [
        'user_id',
        'symbol',
        'level_type',
        'level_value',
        'price_at_trigger',
        'old_price',
        'direction',
        'source',
        'detected_at',
    ];

    protected $casts = [
        'level_value' => 'decimal:2',
        'price_at_trigger' => 'decimal:2',
        'old_price' => 'decimal:2',
        'detected_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function cleanup(int $days = 7): int
    {
        return static::where('detected_at', '<', now()->subDays($days))->delete();
    }
}
