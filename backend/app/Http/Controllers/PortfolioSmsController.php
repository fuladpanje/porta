<?php

namespace App\Http\Controllers;

use App\Models\Portfolio;
use App\Models\PortfolioSmsSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PortfolioSmsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $rows = PortfolioSmsSetting::where('user_id', Auth::id())
            ->select('id', 'portfolio_id', 'send_time', 'enabled')
            ->get();

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row->portfolio_id][] = [
                'id' => $row->id,
                'send_time' => $row->send_time,
                'enabled' => $row->enabled,
            ];
        }

        return response()->json(['data' => $grouped]);
    }

    public function update(Request $request, Portfolio $portfolio): JsonResponse
    {
        $request->validate([
            'times' => 'required|array|min:1',
            'times.*.send_time' => 'required|string|max:8',
            'times.*.enabled' => 'required|boolean',
        ]);

        if ($portfolio->user_id !== Auth::id()) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        $userId = Auth::id();
        $portfolioId = $portfolio->id;

        // حذف ردیف‌های قدیمی این پرتفو + لاگ‌های روزانه مرتبط
        $oldIds = PortfolioSmsSetting::where('user_id', $userId)
            ->where('portfolio_id', $portfolioId)
            ->pluck('id');

        if ($oldIds->isNotEmpty()) {
            DB::table('portfolio_daily_sms_log')
                ->whereIn('portfolio_sms_setting_id', $oldIds)
                ->delete();
            PortfolioSmsSetting::whereIn('id', $oldIds)->delete();
        }

        // درج ردیف‌های جدید
        foreach ($request->input('times') as $t) {
            $time = substr($t['send_time'], 0, 5);
            PortfolioSmsSetting::create([
                'user_id' => $userId,
                'portfolio_id' => $portfolioId,
                'enabled' => $t['enabled'],
                'send_time' => $time,
            ]);
        }

        return response()->json(['message' => 'تنظیمات ذخیره شد']);
    }
}
