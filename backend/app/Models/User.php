<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'username',
        'email',
        'password',
        'unit',
        'auto_switch',
        'schedule_enabled',
        'schedule_seconds',
        'schedule_minutes',
        'schedule_hours',
        'schedule_start_time',
        'schedule_end_time',
        'commission_enabled',
        'buy_commission',
        'sell_commission',
        'is_stale',
        'is_admin',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'auto_switch' => 'boolean',
        'schedule_enabled' => 'boolean',
        'commission_enabled' => 'boolean',
        'buy_commission' => 'float',
        'sell_commission' => 'float',
        'is_stale' => 'boolean',
        'is_admin' => 'boolean',
    ];

    public function portfolios()
    {
        return $this->hasMany(Portfolio::class);
    }

    public function apiKeys()
    {
        return $this->hasMany(ApiKey::class);
    }

    public function favorites()
    {
        return $this->hasMany(Favorite::class);
    }
}