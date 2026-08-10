<?php

namespace App\Http\Controllers;

use App\Models\CrossoverNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrossoverNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min((int) $request->query('limit', 50), 100);

        $notifications = CrossoverNotification::where('user_id', $user->id)
            ->orderByDesc('detected_at')
            ->limit($limit)
            ->get()
            ->map(function ($n) {
                $isResistance = str_starts_with($n->level_type, 'resistance');
                $levelLabel = match ($n->level_type) {
                    'resistance_1' => 'مقاومت ۱',
                    'resistance_2' => 'مقاومت ۲',
                    'support_1' => 'حمایت ۱',
                    'support_2' => 'حمایت ۲',
                    default => $n->level_type,
                };
                $directionLabel = $n->direction === 'up' ? 'شکست رو به بالا' : 'شکست رو به پایین';

                return [
                    'id' => $n->id,
                    'symbol' => $n->symbol,
                    'level_type' => $n->level_type,
                    'level_label' => $levelLabel,
                    'level_value' => (float) $n->level_value,
                    'price' => (float) $n->price_at_trigger,
                    'old_price' => $n->old_price ? (float) $n->old_price : null,
                    'direction' => $n->direction,
                    'direction_label' => $directionLabel,
                    'is_resistance' => $isResistance,
                    'source' => $n->source,
                    'detected_at' => $n->detected_at->toISOString(),
                ];
            });

        return response()->json(['data' => $notifications]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        $deleted = CrossoverNotification::where('user_id', $user->id)->delete();

        return response()->json(['message' => 'سابقه پاک شد', 'deleted' => $deleted]);
    }
}
