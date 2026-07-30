<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PortfolioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $portfolios = $request->user()->portfolios()->with('items')->get();

        return response()->json([
            'data' => $portfolios,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $portfolio = $request->user()->portfolios()->create($validated);

        return response()->json([
            'data' => $portfolio->load('items'),
        ], 201);
    }

    public function show(Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => $portfolio->load('items'),
        ]);
    }

    public function update(Request $request, Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $portfolio->update($validated);

        return response()->json([
            'data' => $portfolio->fresh()->load('items'),
        ]);
    }

    public function destroy(Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $portfolio->delete();

        return response()->json([
            'message' => 'Portfolio deleted.',
        ]);
    }

    public function updateCommission(Request $request, Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $validated = $request->validate([
                'commission_enabled' => 'required|boolean',
                'buy_commission' => 'nullable|numeric|min:0|max:10000',
                'sell_commission' => 'nullable|numeric|min:0|max:10000',
            ]);

            $user = $request->user();
            $updateData = ['commission_enabled' => $validated['commission_enabled']];

            if ($validated['commission_enabled']) {
                $buyComm = $validated['buy_commission'] ?? ($user->buy_commission ?? 0.37);
                $sellComm = $validated['sell_commission'] ?? ($user->sell_commission ?? 0.88);
                if (is_numeric($buyComm) && $buyComm > 1) $buyComm /= 100;
                if (is_numeric($sellComm) && $sellComm > 1) $sellComm /= 100;
                $updateData['buy_commission'] = $buyComm;
                $updateData['sell_commission'] = $sellComm;
            } else {
                $updateData['buy_commission'] = $user->buy_commission ?? 0.37;
                $updateData['sell_commission'] = $user->sell_commission ?? 0.88;
            }

            $portfolio->update($updateData);

            return response()->json([
                'data' => $portfolio->fresh()->load('items'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'message' => 'خطای اعتبارسنجی پورتفولیو: ' . implode(', ', array_merge(...array_values($ve->errors()))),
                'errors' => $ve->errors(),
            ], 422);
        } catch (\Throwable $e) {
            @file_put_contents(storage_path('logs/portfolio-commission-error.log'), date('Y-m-d H:i:s') . " Error: " . $e->getMessage() . "\nTrace:\n" . $e->getTraceAsString() . "\n", FILE_APPEND);
            return response()->json([
                'message' => 'خطای سرور پورتفولیو: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function toggleActive(Portfolio $portfolio): JsonResponse
    {
        if ($portfolio->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $newActive = !$portfolio->active;
        $portfolio->update(['active' => $newActive]);

        $portfolio->items()->update(['active' => $newActive]);

        return response()->json([
            'data' => $portfolio->fresh()->load('items'),
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $userCommissionEnabled = $user->commission_enabled ?? false;
        $userBuyCommissionRate = ($user->buy_commission ?? 0.37) / 100;
        $userSellCommissionRate = ($user->sell_commission ?? 0.88) / 100;

        $portfolios = $user->portfolios()->with('items')->get();

        $totalValue = $portfolios->sum(function ($portfolio) use ($userCommissionEnabled, $userSellCommissionRate) {
            $usePortfolioCommission = !empty($portfolio->commission_enabled);
            $commissionEnabled = $usePortfolioCommission ? true : $userCommissionEnabled;
            $sellCommissionRate = $usePortfolioCommission
                ? ($portfolio->sell_commission ?? 0.88) / 100
                : $userSellCommissionRate;

            return $portfolio->items->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
                $price = $item->sell_price && $item->sell_price > 0
                    ? $item->sell_price
                    : ($item->last_price && $item->last_price > 0 ? $item->last_price : $item->buy_price);

                $raw = $price * $item->quantity;
                $sellComm = $commissionEnabled ? $raw * $sellCommissionRate : 0;
                return $raw - $sellComm;
            });
        });

        $totalCost = $portfolios->sum(function ($p) {
            return $p->items->sum(function ($item) {
                return $item->buy_price * $item->quantity;
            });
        });

        $totalProfitLoss = $portfolios->sum(function ($p) use ($userCommissionEnabled, $userBuyCommissionRate, $userSellCommissionRate) {
            $usePortfolioCommission = !empty($p->commission_enabled);
            $commissionEnabled = $usePortfolioCommission ? true : $userCommissionEnabled;
            $sellCommissionRate = $usePortfolioCommission
                ? ($p->sell_commission ?? 0.88) / 100
                : $userSellCommissionRate;

            return $p->items->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
                if ($item->sell_price && $item->sell_price > 0) {
                    $buyTotal = $item->buy_price * $item->quantity;
                    $sellTotal = $item->sell_price * $item->quantity;
                    $sellComm = $commissionEnabled ? $sellTotal * $sellCommissionRate : 0;
                    return ($sellTotal - $sellComm) - $buyTotal;
                }
                return 0;
            });
        });

        $soldCost = $portfolios->sum(function ($p) {
            return $p->items->sum(function ($item) {
                if ($item->sell_price && $item->sell_price > 0) {
                    return $item->buy_price * $item->quantity;
                }
                return 0;
            });
        });

        $totalProfitLossPercent = $soldCost > 0 ? ($totalProfitLoss / $soldCost) * 100 : 0;

        $allItems = $portfolios->flatMap(function ($p) {
            return $p->items;
        });

        $bestPerformer = $allItems->sortByDesc('sell_price')->first();
        $worstPerformer = $allItems->sortBy('sell_price')->first();

        return response()->json([
            'data' => [
                'total_value' => round($totalValue, 2),
                'total_cost' => round($totalCost, 2),
                'total_profit_loss' => round($totalProfitLoss, 2),
                'total_profit_loss_percent' => round($totalProfitLossPercent, 2),
                'total_items' => $allItems->count(),
                'total_portfolios' => $portfolios->count(),
                'best_performer' => $bestPerformer,
                'worst_performer' => $worstPerformer,
                'portfolios' => $portfolios,
            ],
        ]);
    }
}
