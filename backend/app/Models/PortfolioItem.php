<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioItem extends Model
{
    protected $fillable = [
        'portfolio_id',
        'symbol',
        'last_price',
        'pe',
        'buy_price',
        'quantity',
        'sell_price',
        'resistance_1',
        'resistance_2',
        'resistance_3',
        'support_1',
        'support_2',
        'support_3',
        'active',
    ];

    protected $casts = [
        'buy_price' => 'decimal:2',
        'last_price' => 'decimal:2',
        'pe' => 'decimal:2',
        'quantity' => 'decimal:4',
        'sell_price' => 'decimal:2',
        'resistance_1' => 'decimal:2',
        'resistance_2' => 'decimal:2',
        'resistance_3' => 'decimal:2',
        'support_1' => 'decimal:2',
        'support_2' => 'decimal:2',
        'support_3' => 'decimal:2',
        'active' => 'boolean',
    ];

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }

    public function getProfitLossAttribute(): float
    {
        if ($this->sell_price && $this->sell_price > 0) {
            return ($this->sell_price - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getProfitLossFromResistance1Attribute(): float
    {
        if ($this->resistance_1) {
            return ($this->resistance_1 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getProfitLossFromResistance2Attribute(): float
    {
        if ($this->resistance_2) {
            return ($this->resistance_2 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getProfitLossFromResistance3Attribute(): float
    {
        if ($this->resistance_3) {
            return ($this->resistance_3 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getLossFromSupport1Attribute(): float
    {
        if ($this->support_1) {
            return ($this->support_1 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getLossFromSupport2Attribute(): float
    {
        if ($this->support_2) {
            return ($this->support_2 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }

    public function getLossFromSupport3Attribute(): float
    {
        if ($this->support_3) {
            return ($this->support_3 - $this->buy_price) / $this->buy_price * 100;
        }
        return 0;
    }
}