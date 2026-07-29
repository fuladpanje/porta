<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('porta')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken('porta')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function user(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateUnit(Request $request)
    {
        $validated = $request->validate([
            'unit' => 'required|string|in:rial,toman',
        ]);

        $request->user()->update(['unit' => $validated['unit']]);

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateAutoSwitch(Request $request)
    {
        $validated = $request->validate([
            'auto_switch' => 'required|boolean',
        ]);

        $request->user()->update(['auto_switch' => $validated['auto_switch']]);

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateSchedule(Request $request)
    {
        $validated = $request->validate([
            'schedule_enabled' => 'required|boolean',
            'schedule_seconds' => 'required|integer|min:0',
            'schedule_minutes' => 'required|integer|min:0',
            'schedule_hours' => 'required|integer|min:0',
        ]);

        $request->user()->update([
            'schedule_enabled' => $validated['schedule_enabled'],
            'schedule_seconds' => $validated['schedule_seconds'],
            'schedule_minutes' => $validated['schedule_minutes'],
            'schedule_hours' => $validated['schedule_hours'],
        ]);

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateCommission(Request $request)
    {
        $validated = $request->validate([
            'commission_enabled' => 'required|boolean',
            'buy_commission' => 'required|numeric|min:0|max:100',
            'sell_commission' => 'required|numeric|min:0|max:100',
        ]);

        $request->user()->update([
            'commission_enabled' => $validated['commission_enabled'],
            'buy_commission' => $validated['buy_commission'],
            'sell_commission' => $validated['sell_commission'],
        ]);

        return response()->json([
            'user' => $request->user(),
        ]);
    }
}