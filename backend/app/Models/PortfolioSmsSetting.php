<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioSmsSetting extends Model
{
    protected $fillable = [
        'user_id',
        'portfolio_id',
        'enabled',
        'send_time',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'send_time' => 'string',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }
}
