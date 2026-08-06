<?php

namespace App\Http\Controllers;

use App\Models\UserSymbolLevel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSymbolLevelController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $levels = UserSymbolLevel::where('user_id', $request->user()->id)
            ->where(function ($q) {
                $q->where('resistance_1', '!=', null)
                    ->orWhere('resistance_2', '!=', null)
                    ->orWhere('support_1', '!=', null)
                    ->orWhere('support_2', '!=', null);
            })
            ->get()
            ->keyBy('symbol');

        return response()->json(['data' => $levels]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
            'resistance_1' => 'nullable|numeric|min:0',
            'resistance_2' => 'nullable|numeric|min:0',
            'support_1' => 'nullable|numeric|min:0',
            'support_2' => 'nullable|numeric|min:0',
            'sms_enabled' => 'nullable|boolean',
        ]);

        $level = UserSymbolLevel::updateOrCreate(
            ['user_id' => $request->user()->id, 'symbol' => $validated['symbol']],
            [
                'resistance_1' => $validated['resistance_1'] ?? null,
                'resistance_2' => $validated['resistance_2'] ?? null,
                'support_1' => $validated['support_1'] ?? null,
                'support_2' => $validated['support_2'] ?? null,
                'sms_enabled' => $validated['sms_enabled'] ?? true,
            ]
        );

        return response()->json(['data' => $level]);
    }

    public function destroy(Request $request, string $symbol): JsonResponse
    {
        UserSymbolLevel::where('user_id', $request->user()->id)
            ->where('symbol', $symbol)
            ->update([
                'resistance_1' => null,
                'resistance_2' => null,
                'support_1' => null,
                'support_2' => null,
            ]);

        return response()->json(['message' => 'سطوح حذف شدند']);
    }
}
