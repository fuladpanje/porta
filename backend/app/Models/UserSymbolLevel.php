<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSymbolLevel extends Model
{
    protected $fillable = [
        'user_id',
        'symbol',
        'resistance_1',
        'resistance_2',
        'support_1',
        'support_2',
        'sms_resistance_1_count',
        'sms_resistance_2_count',
        'sms_support_1_count',
        'sms_support_2_count',
        'sms_cooldown_minutes',
        'notification_cooldown_minutes',
    ];

    protected $casts = [
        'resistance_1' => 'decimal:2',
        'resistance_2' => 'decimal:2',
        'support_1' => 'decimal:2',
        'support_2' => 'decimal:2',
        'sms_resistance_1_count' => 'integer',
        'sms_resistance_2_count' => 'integer',
        'sms_support_1_count' => 'integer',
        'sms_support_2_count' => 'integer',
        'sms_cooldown_minutes' => 'integer',
        'notification_cooldown_minutes' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hasAnyLevel(): bool
    {
        return $this->resistance_1 !== null
            || $this->resistance_2 !== null
            || $this->support_1 !== null
            || $this->support_2 !== null;
    }

    public function hasAnySmsEnabled(): bool
    {
        return $this->sms_resistance_1_count > 0
            || $this->sms_resistance_2_count > 0
            || $this->sms_support_1_count > 0
            || $this->sms_support_2_count > 0;
    }
}
