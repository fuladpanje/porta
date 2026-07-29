<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'unit',
        'auto_switch',
        'schedule_enabled',
        'schedule_seconds',
        'schedule_minutes',
        'schedule_hours',
        'commission_enabled',
        'buy_commission',
        'sell_commission',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function portfolios()
    {
        return $this->hasMany(Portfolio::class);
    }

    public function apiKeys()
    {
        return $this->hasMany(ApiKey::class);
    }
}