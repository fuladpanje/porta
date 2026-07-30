<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Portfolio extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'commission_enabled',
        'buy_commission',
        'sell_commission',
        'active',
    ];

    protected $with = ['items'];

    protected $appends = ['total_value', 'total_cost', 'total_profit_loss', 'total_profit_loss_percent'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PortfolioItem::class);
    }

    public function getTotalValueAttribute(): float
    {
        $user = $this->user;
        $usePortfolioCommission = !empty($this->commission_enabled);
        $commissionEnabled = $usePortfolioCommission ? true : ($user->commission_enabled ?? false);
        $sellCommissionRate = $usePortfolioCommission
            ? ($this->sell_commission ?? 0.88) / 100
            : ($user->sell_commission ?? 0.88) / 100;

        return $this->items->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
            $price = $item->sell_price && $item->sell_price > 0
                ? $item->sell_price
                : ($item->last_price && $item->last_price > 0 ? $item->last_price : $item->buy_price);

            $raw = $price * $item->quantity;
            $sellComm = $commissionEnabled ? $raw * $sellCommissionRate : 0;
            return $raw - $sellComm;
        });
    }

    public function getTotalCostAttribute(): float
    {
        return $this->items->sum(function ($item) {
            return $item->buy_price * $item->quantity;
        });
    }

    public function getTotalProfitLossAttribute(): float
    {
        $user = $this->user;
        $usePortfolioCommission = !empty($this->commission_enabled);
        $commissionEnabled = $usePortfolioCommission ? true : ($user->commission_enabled ?? false);
        $sellCommissionRate = $usePortfolioCommission
            ? ($this->sell_commission ?? 0.88) / 100
            : ($user->sell_commission ?? 0.88) / 100;

        return $this->items->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
            if ($item->sell_price && $item->sell_price > 0) {
                $sellTotal = $item->sell_price * $item->quantity;
                $sellComm = $commissionEnabled ? $sellTotal * $sellCommissionRate : 0;
                return ($sellTotal - $sellComm) - ($item->buy_price * $item->quantity);
            }
            if ($item->last_price && $item->last_price > 0) {
                $lastTotal = $item->last_price * $item->quantity;
                $lastComm = $commissionEnabled ? $lastTotal * $sellCommissionRate : 0;
                return ($lastTotal - $lastComm) - ($item->buy_price * $item->quantity);
            }
            return 0;
        });
    }

    public function getTotalProfitLossPercentAttribute(): float
    {
        $soldCost = $this->items->sum(function ($item) {
            if ($item->sell_price && $item->sell_price > 0) {
                return $item->buy_price * $item->quantity;
            }
            if ($item->last_price && $item->last_price > 0) {
                return $item->buy_price * $item->quantity;
            }
            return 0;
        });

        if ($soldCost == 0) {
            return 0;
        }

        return ($this->total_profit_loss / $soldCost) * 100;
    }
}