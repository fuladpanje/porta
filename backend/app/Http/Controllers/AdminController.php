<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function getSettings(Request $request): JsonResponse
    {
        $apiKeys = SystemSetting::getApiKeys();
        $schedule = SystemSetting::getSchedule();
        $autoSwitch = SystemSetting::getAutoSwitch();

        $maskedKeys = array_map(function ($key) {
            return [
                'name' => $key['name'] ?? '',
                'api_key' => substr($key['api_key'] ?? '', 0, 8) . '...' . substr($key['api_key'] ?? '', -4),
                'is_default' => $key['is_default'] ?? false,
            ];
        }, $apiKeys);

        $smsCooldown = (int) SystemSetting::get('sms_cooldown_minutes', '60');

        return response()->json([
            'data' => [
                'api_keys' => $maskedKeys,
                'api_keys_count' => count($apiKeys),
                'schedule' => $schedule,
                'auto_switch' => $autoSwitch,
                'sms_cooldown_minutes' => $smsCooldown,
            ],
        ]);
    }

    public function updateApiKeys(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'api_keys' => 'required|array|min:1',
            'api_keys.*.name' => 'required|string|max:255',
            'api_keys.*.api_key' => 'required|string',
            'auto_switch' => 'required|boolean',
        ]);

        $keys = [];
        foreach ($validated['api_keys'] as $index => $key) {
            $keys[] = [
                'name' => $key['name'],
                'api_key' => $key['api_key'],
                'is_default' => $index === 0,
            ];
        }

        SystemSetting::setApiKeys($keys);
        SystemSetting::set('auto_switch', $validated['auto_switch'] ? 'true' : 'false');

        return response()->json([
            'message' => 'کلیدهای API با موفقیت بروزرسانی شدند.',
        ]);
    }

    public function addApiKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'api_key' => 'required|string',
        ]);

        $keys = SystemSetting::getApiKeys();
        $isFirst = empty($keys);

        $keys[] = [
            'name' => $validated['name'],
            'api_key' => $validated['api_key'],
            'is_default' => $isFirst,
        ];

        SystemSetting::setApiKeys($keys);

        return response()->json([
            'message' => 'کلید API با موفقیت اضافه شد.',
        ], 201);
    }

    public function deleteApiKey(Request $request, int $index): JsonResponse
    {
        $keys = SystemSetting::getApiKeys();

        if (!isset($keys[$index])) {
            return response()->json([
                'message' => 'کلید API یافت نشد.',
            ], 404);
        }

        $wasDefault = $keys[$index]['is_default'] ?? false;
        array_splice($keys, $index, 1);

        if ($wasDefault && !empty($keys)) {
            $keys[0]['is_default'] = true;
        }

        SystemSetting::setApiKeys($keys);

        return response()->json([
            'message' => 'کلید API با موفقیت حذف شد.',
        ]);
    }

    public function updateSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'schedule_enabled' => 'required|boolean',
            'schedule_seconds' => 'required|integer|min:0',
            'schedule_minutes' => 'required|integer|min:0',
            'schedule_hours' => 'required|integer|min:0',
            'schedule_start_time' => 'nullable|string',
            'schedule_end_time' => 'nullable|string',
        ]);

        SystemSetting::set('schedule_enabled', $validated['schedule_enabled'] ? 'true' : 'false');
        SystemSetting::set('schedule_seconds', (string) $validated['schedule_seconds']);
        SystemSetting::set('schedule_minutes', (string) $validated['schedule_minutes']);
        SystemSetting::set('schedule_hours', (string) $validated['schedule_hours']);
        SystemSetting::set('schedule_start_time', $validated['schedule_start_time'] ?? null);
        SystemSetting::set('schedule_end_time', $validated['schedule_end_time'] ?? null);

        return response()->json([
            'message' => 'تنظیمات زمان‌بندی با موفقیت بروزرسانی شد.',
        ]);
    }

    public function refreshSymbols(): JsonResponse
    {
        try {
            $exitCode = \Illuminate\Support\Facades\Artisan::call('symbols:refresh');
            $output = \Illuminate\Support\Facades\Artisan::output();

            return response()->json([
                'message' => 'بروزرسانی نمادها با موفقیت انجام شد.',
                'output' => $output,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'خطا در بروزرسانی نمادها: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function updateSmsSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sms_cooldown_minutes' => 'required|integer|min:1|max:1440',
        ]);

        SystemSetting::set('sms_cooldown_minutes', (string) $validated['sms_cooldown_minutes']);

        return response()->json([
            'message' => 'تنظیمات پیامک با موفقیت ذخیره شد.',
            'data' => [
                'sms_cooldown_minutes' => $validated['sms_cooldown_minutes'],
            ],
        ]);
    }

    public function testSms(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string|max:20',
            'message' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        if (!$user->hasSmsConfigured()) {
            return response()->json([
                'message' => 'تنظیمات پیامک شما ناقص است. (API Key، شماره فرستنده و شماره موبایل باید در تنظیمات شخصی وارد شده باشد)',
            ], 422);
        }

        $message = $validated['message'] ?? 'پیام تست پورتفولیو. این پیام برای بررسی صحت ارسال پیامک ارسال شده است.';

        try {
            $client = new \Ippanel\Client($user->ippanel_api_key);
            $response = $client->sendWebservice($message, $user->ippanel_sender, [$validated['phone']]);

            if ($response->isSuccessful()) {
                return response()->json([
                    'message' => 'پیامک تست با موفقیت ارسال شد.',
                ]);
            }

            return response()->json([
                'message' => 'خطا در ارسال پیامک: ' . $response->getMessage(),
            ], 500);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'خطا در ارسال پیامک: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function testSmsWithUserKey(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = \App\Models\User::findOrFail($validated['user_id']);

        if (!$user->hasSmsConfigured()) {
            return response()->json([
                'message' => 'تنظیمات پیامک کاربر ناقص است. (API Key، شماره فرستنده و شماره موبایل باید وارد شده باشد)',
            ], 422);
        }

        $message = 'پیام تست از پنل مدیریت. سلام ' . $user->username . '!';

        try {
            $client = new \Ippanel\Client($user->ippanel_api_key);
            $response = $client->sendWebservice($message, $user->ippanel_sender, [$user->phone]);

            if ($response->isSuccessful()) {
                return response()->json([
                    'message' => 'پیامک تست با موفقیت به ' . $user->username . ' ارسال شد.',
                ]);
            }

            return response()->json([
                'message' => 'خطا در ارسال پیامک: ' . $response->getMessage(),
            ], 500);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'خطا در ارسال پیامک: ' . $e->getMessage(),
            ], 500);
        }
    }
}
