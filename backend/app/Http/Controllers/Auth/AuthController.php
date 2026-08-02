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
    private function enrichUser($user): array
    {
        $schedule = \App\Models\SystemSetting::getSchedule();
        $userData = $user->toArray();
        $userData['has_api_keys'] = !empty(\App\Models\SystemSetting::getApiKeys());
        $userData['schedule_enabled'] = $schedule['enabled'];
        $userData['schedule_seconds'] = $schedule['seconds'];
        $userData['schedule_minutes'] = $schedule['minutes'];
        $userData['schedule_hours'] = $schedule['hours'];
        $userData['schedule_start_time'] = $schedule['start_time'];
        $userData['schedule_end_time'] = $schedule['end_time'];
        return $userData;
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $adminEmail = env('ADMIN_EMAIL');
        $isFirstUser = \App\Models\User::count() === 0;
        $isAdmin = ($adminEmail && strtolower($validated['email']) === strtolower($adminEmail)) || $isFirstUser;

        $user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $isAdmin,
        ]);

        $token = $user->createToken('porta')->plainTextToken;

        return response()->json([
            'user' => $this->enrichUser($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])
            ->orWhere('username', $validated['email'])
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken('porta')->plainTextToken;

        return response()->json([
            'user' => $this->enrichUser($user),
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
            'user' => $this->enrichUser($request->user()),
        ]);
    }

    public function updateUnit(Request $request)
    {
        $validated = $request->validate([
            'unit' => 'required|string|in:rial,toman',
        ]);

        $request->user()->update(['unit' => $validated['unit']]);

        return response()->json([
            'user' => $this->enrichUser($request->user()->fresh()),
        ]);
    }

    public function updateAutoSwitch(Request $request)
    {
        $validated = $request->validate([
            'auto_switch' => 'required|boolean',
        ]);

        $request->user()->update(['auto_switch' => $validated['auto_switch']]);

        return response()->json([
            'user' => $this->enrichUser($request->user()->fresh()),
        ]);
    }

    public function updateSchedule(Request $request)
    {
        $validated = $request->validate([
            'schedule_enabled' => 'required|boolean',
            'schedule_seconds' => 'required|integer|min:0',
            'schedule_minutes' => 'required|integer|min:0',
            'schedule_hours' => 'required|integer|min:0',
            'schedule_start_time' => 'nullable|string',
            'schedule_end_time' => 'nullable|string',
        ]);

        $request->user()->update([
            'schedule_enabled' => $validated['schedule_enabled'],
            'schedule_seconds' => $validated['schedule_seconds'],
            'schedule_minutes' => $validated['schedule_minutes'],
            'schedule_hours' => $validated['schedule_hours'],
            'schedule_start_time' => $validated['schedule_start_time'] ?? null,
            'schedule_end_time' => $validated['schedule_end_time'] ?? null,
        ]);

        return response()->json([
            'user' => $this->enrichUser($request->user()->fresh()),
        ]);
    }

    public function updateCommission(Request $request)
    {
        try {
            $validated = $request->validate([
                'commission_enabled' => 'required|boolean',
                'buy_commission' => 'required|numeric|min:0|max:10000',
                'sell_commission' => 'required|numeric|min:0|max:10000',
            ]);

            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'کاربر یافت نشد یا احراز هویت نشده است.'], 401);
            }

            $buyCommission = (float)$validated['buy_commission'];
            $sellCommission = (float)$validated['sell_commission'];
            if ($buyCommission > 1) $buyCommission /= 100;
            if ($sellCommission > 1) $sellCommission /= 100;

            $user->update([
                'commission_enabled' => (bool)$validated['commission_enabled'],
                'buy_commission' => $buyCommission,
                'sell_commission' => $sellCommission,
            ]);

            return response()->json([
                'user' => $this->enrichUser($user->fresh()),
            ]);
        } catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'message' => 'خطای اعتبارسنجی: ' . implode(', ', array_merge(...array_values($ve->errors()))),
                'errors' => $ve->errors(),
            ], 422);
        } catch (\Throwable $e) {
            @file_put_contents(storage_path('logs/commission-error.log'), date('Y-m-d H:i:s') . " Error: " . $e->getMessage() . "\nTrace:\n" . $e->getTraceAsString() . "\n", FILE_APPEND);
            return response()->json([
                'message' => 'خطای سرور: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['رمز فعلی اشتباه است.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'رمز با موفقیت تغییر یافت.',
            'user' => $this->enrichUser($user->fresh()),
        ]);
    }

    public function updateStale(Request $request)
    {
        $validated = $request->validate([
            'is_stale' => 'required|boolean',
        ]);

        $request->user()->update([
            'is_stale' => $validated['is_stale'],
        ]);

        return response()->json([
            'user' => $this->enrichUser($request->user()->fresh()),
        ]);
    }

}