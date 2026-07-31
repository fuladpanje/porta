<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'api_key',
        'is_default',
        'daily_requests',
        'last_reset_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'last_reset_at' => 'datetime',
    ];

    protected $hidden = [
        'api_key',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}