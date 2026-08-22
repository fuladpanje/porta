<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\PortfolioItem;
use App\Models\PortfolioItemTransaction;
use App\Models\SmsNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PortfolioItemController extends Controller
{
    private function hasNotificationCooldownColumn(): bool
    {
        static $has = null;
        if ($has === null) {
            $has = Schema::hasColumn('portfolio_items', 'notification_cooldown_minutes');
        }
        return $has;
    }

    public function index(Request $request, Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $portfolio->items()->orderBy('created_at', 'desc')->get(),
        ]);
    }

    public function store(Request $request, Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $rules = [
            'symbol' => 'required|string|max:255',
            'buy_price' => 'required|numeric|min:0',
            'quantity' => 'required|numeric|min:0',
            'sell_price' => 'nullable|numeric|min:0',
            'last_price' => 'nullable|numeric|min:0',
            'pe' => 'nullable|numeric',
            'resistance_1' => 'nullable|numeric|min:0',
            'resistance_2' => 'nullable|numeric|min:0',
            'resistance_3' => 'nullable|numeric|min:0',
            'support_1' => 'nullable|numeric|min:0',
            'support_2' => 'nullable|numeric|min:0',
            'support_3' => 'nullable|numeric|min:0',
            'buy_i_volume' => 'nullable|numeric',
            'buy_count_i' => 'nullable|numeric',
            'sell_i_volume' => 'nullable|numeric',
            'sell_count_i' => 'nullable|numeric',
            'active' => 'boolean',
            'sms_resistance_1_count' => 'nullable|integer|min:0|max:100',
            'sms_resistance_2_count' => 'nullable|integer|min:0|max:100',
            'sms_support_1_count' => 'nullable|integer|min:0|max:100',
            'sms_support_2_count' => 'nullable|integer|min:0|max:100',
            'is_custom' => 'nullable|boolean',
        ];

        if ($this->hasNotificationCooldownColumn()) {
            $rules['notification_cooldown_minutes'] = 'nullable|integer|min:1|max:1440';
        }

        $validated = $request->validate($rules);

        $smsCountFields = ['sms_resistance_1_count', 'sms_resistance_2_count', 'sms_support_1_count', 'sms_support_2_count'];
        foreach ($smsCountFields as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] === null) {
                unset($validated[$field]);
            }
        }

        // یکتایی نماد در هر پرتفو: اگر قبلاً وجود دارد میانگین بگیر
        $mergedResponse = null;
        $existing = $portfolio->items()
            ->whereRaw('LOWER(symbol) = ?', [Str::lower($validated['symbol'])])
            ->first();

        if ($existing) {
            try {
                DB::transaction(function () use ($portfolio, $validated, $existing, &$mergedResponse) {
                    $locked = $portfolio->items()->where('id', $existing->id)->lockForUpdate()->first();
                    $target = $locked ?: $existing;
                    $oldQty = (float) $target->quantity;
                    $oldPrice = (float) $target->buy_price;
                    $addQty = (float) $validated['quantity'];
                    $addPrice = (float) $validated['buy_price'];

                    if ($addQty <= 0) {
                        $mergedResponse = response()->json(['message' => 'تعداد باید بزرگتر از صفر باشد'], 422);
                        return;
                    }

                    $newQty = $oldQty + $addQty;
                    $newAvg = round(($oldQty * $oldPrice + $addQty * $addPrice) / $newQty);

                    $target->update([
                        'quantity' => $newQty,
                        'buy_price' => $newAvg,
                    ]);

                    try {
                        PortfolioItemTransaction::create([
                            'portfolio_item_id' => $target->id,
                            'portfolio_id' => $portfolio->id,
                            'type' => 'buy',
                            'quantity' => $addQty,
                            'price' => $addPrice,
                            'resulting_quantity' => $newQty,
                            'resulting_avg_price' => $newAvg,
                        ]);
                    } catch (\Throwable $e) {
                        Log::warning('store merge transaction log failed: '.$e->getMessage());
                    }

                    $mergedResponse = response()->json([
                        'data' => $target->fresh(),
                        'merged' => true,
                        'message' => 'سهم قبلاً موجود بود، تعداد افزایش یافت و میانگین محاسبه شد',
                    ], 200);
                });
            } catch (\Throwable $e) {
                // فال‌بک بدون lock/transaction برای هاست‌های محدود
                Log::warning('store merge with lock failed, fallback: '.$e->getMessage());
                $oldQty = (float) $existing->quantity;
                $oldPrice = (float) $existing->buy_price;
                $addQty = (float) $validated['quantity'];
                $addPrice = (float) $validated['buy_price'];
                $newQty = $oldQty + $addQty;
                $newAvg = round(($oldQty * $oldPrice + $addQty * $addPrice) / $newQty);
                $existing->update(['quantity' => $newQty, 'buy_price' => $newAvg]);
                try {
                    PortfolioItemTransaction::create([
                        'portfolio_item_id' => $existing->id,
                        'portfolio_id' => $portfolio->id,
                        'type' => 'buy',
                        'quantity' => $addQty,
                        'price' => $addPrice,
                        'resulting_quantity' => $newQty,
                        'resulting_avg_price' => $newAvg,
                    ]);
                } catch (\Throwable $e2) { Log::warning('fallback merge log failed: '.$e2->getMessage()); }
                $mergedResponse = response()->json([
                    'data' => $existing->fresh(),
                    'merged' => true,
                    'message' => 'سهم قبلاً موجود بود، تعداد افزایش یافت و میانگین محاسبه شد (fallback)',
                ], 200);
            }
        }

        if ($mergedResponse) {
            return $mergedResponse;
        }

        $item = $portfolio->items()->create($validated);

        // ثبت تراکنش اولیه برای تاریخچه
        try {
            PortfolioItemTransaction::create([
                'portfolio_item_id' => $item->id,
                'portfolio_id' => $portfolio->id,
                'type' => 'buy',
                'quantity' => (float) $validated['quantity'],
                'price' => (float) $validated['buy_price'],
                'resulting_quantity' => (float) $validated['quantity'],
                'resulting_avg_price' => (float) $validated['buy_price'],
            ]);
        } catch (\Throwable $e) {
            // لاگ ولی مانع ایجاد آیتم نشو
        }

        return response()->json([
            'data' => $item->fresh(),
        ], 201);
    }

    public function show(Request $request, Portfolio $portfolio, $itemId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = $portfolio->items()->findOrFail($itemId);

        return response()->json([
            'data' => $item,
        ]);
    }

    public function update(Request $request, Portfolio $portfolio, $itemId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = $portfolio->items()->findOrFail($itemId);

        $rules = [
            'symbol' => 'sometimes|required|string|max:255',
            'buy_price' => 'sometimes|required|numeric|min:0',
            'quantity' => 'sometimes|required|numeric|min:0',
            'sell_price' => 'nullable|numeric|min:0',
            'last_price' => 'nullable|numeric|min:0',
            'pe' => 'nullable|numeric',
            'resistance_1' => 'nullable|numeric|min:0',
            'resistance_2' => 'nullable|numeric|min:0',
            'resistance_3' => 'nullable|numeric|min:0',
            'support_1' => 'nullable|numeric|min:0',
            'support_2' => 'nullable|numeric|min:0',
            'support_3' => 'nullable|numeric|min:0',
            'buy_i_volume' => 'nullable|numeric',
            'buy_count_i' => 'nullable|numeric',
            'sell_i_volume' => 'nullable|numeric',
            'sell_count_i' => 'nullable|numeric',
            'active' => 'boolean',
            'sms_resistance_1_count' => 'nullable|integer|min:0|max:100',
            'sms_resistance_2_count' => 'nullable|integer|min:0|max:100',
            'sms_support_1_count' => 'nullable|integer|min:0|max:100',
            'sms_support_2_count' => 'nullable|integer|min:0|max:100',
            'is_custom' => 'nullable|boolean',
        ];

        if ($this->hasNotificationCooldownColumn()) {
            $rules['notification_cooldown_minutes'] = 'nullable|integer|min:1|max:1440';
        }

        $validated = $request->validate($rules);

        $smsCountFields = ['sms_resistance_1_count', 'sms_resistance_2_count', 'sms_support_1_count', 'sms_support_2_count'];
        foreach ($smsCountFields as $field) {
            if (array_key_exists($field, $validated) && $validated[$field] === null) {
                unset($validated[$field]);
            }
        }

        $item->update($validated);

        // فال‌بک تاریخچه: وقتی هاست WAF مسیر add-purchase را بلاک می‌کند، فرانت‌اند با PUT
        // مقدار کل را آپدیت می‌کند و added_quantity/added_price را هم می‌فرستد تا اینجا تراکنش ثبت شود
        $addedQty = $request->input('added_quantity');
        $addedPrice = $request->input('added_price');
        if ($addedQty !== null && $addedPrice !== null && (float) $addedQty > 0) {
            try {
                PortfolioItemTransaction::create([
                    'portfolio_item_id' => $item->id,
                    'portfolio_id' => $portfolio->id,
                    'type' => 'buy',
                    'quantity' => (float) $addedQty,
                    'price' => (float) $addedPrice,
                    'resulting_quantity' => (float) $item->quantity,
                    'resulting_avg_price' => (float) $item->buy_price,
                ]);
            } catch (\Throwable $e) {
                Log::warning('update fallback transaction log failed: ' . $e->getMessage());
            }
        }

        $levelFields = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];
        $levelChanged = array_intersect_key($validated, array_flip($levelFields));
        if (!empty($levelChanged)) {
            $userId = $item->portfolio->user_id ?? null;
            if ($userId) {
                SmsNotification::where('user_id', $userId)
                    ->where('symbol', $item->symbol)
                    ->delete();
            }
        }

        return response()->json([
            'data' => $item->fresh(),
        ]);
    }

    public function destroy(Request $request, Portfolio $portfolio, $itemId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = $portfolio->items()->findOrFail($itemId);
        $item->delete();

        return response()->json([
            'message' => 'Portfolio item deleted.',
        ]);
    }

    public function addPurchase(Request $request, Portfolio $portfolio, $itemId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $validated = $request->validate([
                'added_quantity' => 'required|numeric|min:0.0001',
                'added_price' => 'required|numeric|min:0',
            ]);

            $addQty = (float) $validated['added_quantity'];
            $addPrice = (float) $validated['added_price'];

            // تلاش اول: با تراکنش و lockForUpdate
            try {
                return DB::transaction(function () use ($portfolio, $itemId, $addQty, $addPrice) {
                    $item = $portfolio->items()->where('id', $itemId)->lockForUpdate()->firstOrFail();
                    $oldQty = (float) $item->quantity;
                    $oldPrice = (float) $item->buy_price;

                    $newQty = $oldQty + $addQty;
                    $newAvg = ($oldQty * $oldPrice + $addQty * $addPrice) / $newQty;
                    $newAvg = round($newAvg);

                    $item->update([
                        'quantity' => $newQty,
                        'buy_price' => $newAvg,
                    ]);

                    $tx = null;
                    try {
                        $tx = PortfolioItemTransaction::create([
                            'portfolio_item_id' => $item->id,
                            'portfolio_id' => $portfolio->id,
                            'type' => 'buy',
                            'quantity' => $addQty,
                            'price' => $addPrice,
                            'resulting_quantity' => $newQty,
                            'resulting_avg_price' => $newAvg,
                        ]);
                    } catch (\Throwable $e) {
                        Log::warning('addPurchase transaction log failed: '.$e->getMessage());
                    }

                    return response()->json([
                        'data' => $item->fresh(),
                        'transaction' => $tx,
                        'message' => 'تعداد با موفقیت افزایش یافت',
                    ]);
                });
            } catch (\Throwable $inner) {
                Log::warning('addPurchase with lockForUpdate failed, fallback to simple update: '.$inner->getMessage());
                // فال‌بک: بدون lock و بدون تراکنش تاریخچه - برای هاست‌های با MyISAM یا محدودیت
                $item = $portfolio->items()->where('id', $itemId)->firstOrFail();
                $oldQty = (float) $item->quantity;
                $oldPrice = (float) $item->buy_price;
                $newQty = $oldQty + $addQty;
                $newAvg = round(($oldQty * $oldPrice + $addQty * $addPrice) / $newQty);
                $item->update(['quantity' => $newQty, 'buy_price' => $newAvg]);
                try {
                    PortfolioItemTransaction::create([
                        'portfolio_item_id' => $item->id,
                        'portfolio_id' => $portfolio->id,
                        'type' => 'buy',
                        'quantity' => $addQty,
                        'price' => $addPrice,
                        'resulting_quantity' => $newQty,
                        'resulting_avg_price' => $newAvg,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('fallback transaction log failed: '.$e->getMessage());
                }
                return response()->json([
                    'data' => $item->fresh(),
                    'message' => 'تعداد با موفقیت افزایش یافت (fallback)',
                ]);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('addPurchase failed: '.$e->getMessage().' '.$e->getTraceAsString());
            return response()->json(['message' => 'خطا در افزایش موجودی: '.$e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
        }
    }

    public function transactions(Request $request, Portfolio $portfolio, $itemId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = $portfolio->items()->findOrFail($itemId);

        try {
            $txs = $item->transactions()->orderBy('created_at', 'desc')->get();
            // بک‌فیل: اگر سهم قدیمی است و هیچ تاریخچه‌ای ندارد، از وضعیت فعلی یک تراکنش بساز
            if ($txs->isEmpty()) {
                try {
                    $tx = PortfolioItemTransaction::create([
                        'portfolio_item_id' => $item->id,
                        'portfolio_id' => $portfolio->id,
                        'type' => 'buy',
                        'quantity' => (float) $item->quantity,
                        'price' => (float) $item->buy_price,
                        'resulting_quantity' => (float) $item->quantity,
                        'resulting_avg_price' => (float) $item->buy_price,
                    ]);
                    $txs = $item->transactions()->orderBy('created_at', 'desc')->get();
                } catch (\Throwable $e) {
                    Log::warning('backfill transaction failed: '.$e->getMessage());
                }
            }
        } catch (\Throwable $e) {
            Log::error('transactions fetch failed: '.$e->getMessage());
            return response()->json(['data' => [], 'message' => 'خطا در دریافت تاریخچه: '.$e->getMessage()]);
        }

        return response()->json([
            'data' => $txs,
        ]);
    }

    public function destroyTransaction(Request $request, Portfolio $portfolio, $itemId, $transactionId): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = $portfolio->items()->findOrFail($itemId);
        try {
            $tx = $item->transactions()->where('id', $transactionId)->firstOrFail();
        } catch (\Throwable $e) {
            Log::error('destroyTransaction find failed: '.$e->getMessage());
            return response()->json(['message' => 'تراکنش یافت نشد: '.$e->getMessage()], 404);
        }

        // اگر تنها یک تراکنش مانده، حذف آن به معنی صفر شدن موجودی است؛ اجازه نمی‌دهیم، کاربر باید سهم را حذف کند
        $totalCount = $item->transactions()->count();
        if ($totalCount <= 1) {
            return response()->json(['message' => 'نمی‌توان آخرین تراکنش را حذف کرد. برای حذف سهم از دکمه حذف استفاده کنید.'], 422);
        }

        return DB::transaction(function () use ($item, $tx) {
            $tx->delete();

            $remaining = $item->transactions()->orderBy('created_at', 'asc')->get();

            if ($remaining->isEmpty()) {
                // این حالت نباید رخ دهد به خاطر چک بالا، ولی برای اطمینان
                return response()->json(['message' => 'تمام تراکنش‌ها حذف شد'], 200);
            }

            // محاسبه مجدد میانگین وزنی از روی باقی‌مانده‌ها
            $totalQty = 0;
            $totalCost = 0;
            foreach ($remaining as $r) {
                $totalQty += (float) $r->quantity;
                $totalCost += (float) $r->quantity * (float) $r->price;
            }

            if ($totalQty <= 0) {
                return response()->json(['message' => 'مجموع تعداد نامعتبر است'], 422);
            }

            $newAvg = round($totalCost / $totalQty);
            $newQty = $totalQty;

            $item->update([
                'quantity' => $newQty,
                'buy_price' => $newAvg,
            ]);

            // بروزرسانی resulting_* برای باقی‌مانده‌ها به ترتیب زمانی
            $runningQty = 0;
            $runningCost = 0;
            foreach ($remaining as $r) {
                $runningQty += (float) $r->quantity;
                $runningCost += (float) $r->quantity * (float) $r->price;
                $avg = $runningQty > 0 ? round($runningCost / $runningQty) : 0;
                $r->update([
                    'resulting_quantity' => $runningQty,
                    'resulting_avg_price' => $avg,
                ]);
            }

            return response()->json([
                'data' => $item->fresh(),
                'transactions' => $item->transactions()->orderBy('created_at', 'desc')->get(),
                'message' => 'تراکنش حذف شد و میانگین دوباره محاسبه شد',
            ]);
        });
    }
}
