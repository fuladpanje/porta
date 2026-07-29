<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ApiKeyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $keys = $request->user()->apiKeys()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $keys->map(function ($key) {
                return [
                    'id' => $key->id,
                    'name' => $key->name,
                    'api_key' => $key->getOriginal('api_key'),
                    'is_default' => $key->is_default,
                    'created_at' => $key->created_at->toIso8601String(),
                ];
            }),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'api_key' => 'required|string',
        ]);

        $isFirst = $request->user()->apiKeys()->count() === 0;

        $apiKey = $request->user()->apiKeys()->create([
            'name' => $validated['name'],
            'api_key' => $validated['api_key'],
            'is_default' => $isFirst,
        ]);

        return response()->json([
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'api_key' => $apiKey->getOriginal('api_key'),
                'is_default' => $apiKey->is_default,
                'created_at' => $apiKey->created_at->toIso8601String(),
            ],
        ], 201);
    }

    public function show(ApiKey $apiKey): JsonResponse
    {
        if ($apiKey->user_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'api_key' => $apiKey->api_key,
                'is_default' => $apiKey->is_default,
            ],
        ]);
    }

    public function update(Request $request, ApiKey $apiKey): JsonResponse
    {
        if ($apiKey->user_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'api_key' => 'sometimes|required|string',
        ]);

        $apiKey->update($validated);

        return response()->json([
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'api_key' => $apiKey->getOriginal('api_key'),
                'is_default' => $apiKey->is_default,
            ],
        ]);
    }

    public function destroy(Request $request, ApiKey $apiKey): JsonResponse
    {
        if ($apiKey->user_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $wasDefault = $apiKey->is_default;
        $apiKey->delete();

        if ($wasDefault) {
            $next = $request->user()->apiKeys()->orderBy('created_at', 'asc')->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json([
            'message' => 'API key deleted successfully.',
        ]);
    }

    public function setDefault(Request $request, ApiKey $apiKey): JsonResponse
    {
        if ($apiKey->user_id !== request()->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->user()->apiKeys()->update(['is_default' => false]);
        $apiKey->update(['is_default' => true]);

        return response()->json([
            'data' => [
                'id' => $apiKey->id,
                'name' => $apiKey->name,
                'is_default' => true,
            ],
        ]);
    }
}