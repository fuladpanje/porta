<?php

namespace App\Http\Controllers;

use App\Models\UserSymbolLevel;
use App\Models\SmsNotification;
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

    public function sentCounts(Request $request, string $symbol): JsonResponse
    {
        $userId = $request->user()->id;
        $levelTypes = ['resistance_1', 'resistance_2', 'support_1', 'support_2'];

        $counts = SmsNotification::where('user_id', $userId)
            ->where('symbol', $symbol)
            ->whereIn('level_type', $levelTypes)
            ->select('level_type')
            ->selectRaw('COUNT(*) as cnt')
            ->groupBy('level_type')
            ->pluck('cnt', 'level_type')
            ->toArray();

        $result = [];
        foreach ($levelTypes as $lt) {
            $result[$lt] = (int) ($counts[$lt] ?? 0);
        }

        return response()->json(['data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
            'resistance_1' => 'nullable|numeric|min:0',
            'resistance_2' => 'nullable|numeric|min:0',
            'support_1' => 'nullable|numeric|min:0',
            'support_2' => 'nullable|numeric|min:0',
            'sms_resistance_1_count' => 'nullable|integer|min:0|max:100',
            'sms_resistance_2_count' => 'nullable|integer|min:0|max:100',
            'sms_support_1_count' => 'nullable|integer|min:0|max:100',
            'sms_support_2_count' => 'nullable|integer|min:0|max:100',
            'sms_cooldown_minutes' => 'nullable|integer|min:1|max:1440',
        ]);

        $user = $request->user();

        $level = UserSymbolLevel::updateOrCreate(
            ['user_id' => $user->id, 'symbol' => $validated['symbol']],
            [
                'resistance_1' => $validated['resistance_1'] ?? null,
                'resistance_2' => $validated['resistance_2'] ?? null,
                'support_1' => $validated['support_1'] ?? null,
                'support_2' => $validated['support_2'] ?? null,
                'sms_resistance_1_count' => $validated['sms_resistance_1_count'] ?? 0,
                'sms_resistance_2_count' => $validated['sms_resistance_2_count'] ?? 0,
                'sms_support_1_count' => $validated['sms_support_1_count'] ?? 0,
                'sms_support_2_count' => $validated['sms_support_2_count'] ?? 0,
                'sms_cooldown_minutes' => $validated['sms_cooldown_minutes'] ?? 60,
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
                'sms_resistance_1_count' => 0,
                'sms_resistance_2_count' => 0,
                'sms_support_1_count' => 0,
                'sms_support_2_count' => 0,
            ]);

        return response()->json(['message' => 'سطوح حذف شدند']);
    }
}
