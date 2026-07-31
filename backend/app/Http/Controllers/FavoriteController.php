<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FavoriteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $symbols = $request->user()->favorites()->pluck('symbol')->toArray();

        return response()->json([
            'data' => $symbols,
        ]);
    }

    public function toggle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'symbol' => 'required|string|max:20',
        ]);

        $user = $request->user();
        $symbol = $validated['symbol'];

        $existing = $user->favorites()->where('symbol', $symbol)->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['data' => ['favorited' => false]]);
        }

        $user->favorites()->create(['symbol' => $symbol]);
        return response()->json(['data' => ['favorited' => true]]);
    }
}
