<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortfolioItemTransaction extends Model
{
    protected $fillable = [
        'portfolio_item_id',
        'portfolio_id',
        'type',
        'quantity',
        'price',
        'resulting_quantity',
        'resulting_avg_price',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'price' => 'decimal:2',
        'resulting_quantity' => 'decimal:4',
        'resulting_avg_price' => 'decimal:2',
    ];

    public function portfolioItem(): BelongsTo
    {
        return $this->belongsTo(PortfolioItem::class);
    }

    public function portfolio(): BelongsTo
    {
        return $this->belongsTo(Portfolio::class);
    }
}
