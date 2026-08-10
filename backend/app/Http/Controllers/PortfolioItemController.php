<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\PortfolioItem;
use App\Models\SmsNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PortfolioItemController extends Controller
{
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

        $validated = $request->validate([
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
        ]);

        $item = $portfolio->items()->create($validated);

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

        $validated = $request->validate([
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
        ]);

        $item->update($validated);

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
}
