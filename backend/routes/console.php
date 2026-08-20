<?php

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Schedule;

Schedule::command('symbols:refresh')->when(function () {
    $schedule = SystemSetting::getSchedule();
    if (!$schedule['enabled']) {
        return false;
    }

    $s = $schedule['seconds'] ?? 0;
    $m = $schedule['minutes'] ?? 0;
    $h = $schedule['hours'] ?? 0;
    $totalSeconds = ($h * 3600) + ($m * 60) + $s;

    if ($totalSeconds <= 0) {
        return false;
    }

    // Check time range if configured
    $startTime = $schedule['start_time'] ?? null;
    $endTime   = $schedule['end_time'] ?? null;
    if ($startTime && $endTime) {
        $now = now()->timezone('Asia/Tehran')->format('H:i');

        if ($now === $endTime) {
            return false;
        }

        $inRange = ($startTime <= $endTime)
            ? ($now >= $startTime && $now <= $endTime)
            : ($now >= $startTime || $now <= $endTime);

        if (!$inRange) {
            return false;
        }
    }

    // Use database instead of cache for reliability on shared hosting
    $lastRun      = (int) SystemSetting::get('schedule_last_symbols_refresh', '0');
    $nowTimestamp = now()->timezone('Asia/Tehran')->timestamp;

    if (($nowTimestamp - $lastRun) >= $totalSeconds) {
        SystemSetting::set('schedule_last_symbols_refresh', (string) $nowTimestamp);
        return true;
    }

    return false;
})->everyMinute();

// بروزرسانی نهایی دقیقاً ساعت پایان بازار
Schedule::command('symbols:refresh --final')->when(function () {
    $schedule = SystemSetting::getSchedule();
    if (!$schedule['enabled']) {
        return false;
    }

    $endTime = $schedule['end_time'] ?? null;
    if (!$endTime) {
        return false;
    }

    $now = now()->timezone('Asia/Tehran')->format('H:i');

    // اجرا در دقیقه دقیق پایان بازار
    if ($now !== $endTime) {
        return false;
    }

    $today = now()->timezone('Asia/Tehran')->format('Y-m-d');
    if (SystemSetting::get('schedule_last_final_refresh_date') === $today) {
        return false;
    }

    SystemSetting::set('schedule_last_final_refresh_date', $today);
    return true;
})->everyMinute();

// تلاش مجدد بعد از اتمام بازار (هر ۵ دقیقه، حداکثر ۳ بار)
Schedule::command('symbols:refresh --post-market')->when(function () {
    $endTime = SystemSetting::get('schedule_end_time');
    if (!$endTime) {
        return false;
    }

    // فقط بعد از ساعت پایان بازار
    $now = now()->timezone('Asia/Tehran')->format('H:i');
    if ($now <= $endTime) {
        return false;
    }

    // بررسی آیا بروزرسانی نهایی موفق بوده
    $finalRefreshDone = SystemSetting::get('post_market_final_refresh_done', 'false');
    if ($finalRefreshDone === 'true') {
        return false;
    }

    // بررسی تعداد تلاش‌های بعد از بازار
    $postMarketAttempts = (int) SystemSetting::get('post_market_attempts', '0');
    if ($postMarketAttempts >= 3) {
        return false;
    }

    // بررسی فاصله زمانی (هر ۵ دقیقه)
    $lastPostMarketRun = (int) SystemSetting::get('schedule_last_post_market_refresh', '0');
    $nowTimestamp = now()->timezone('Asia/Tehran')->timestamp;

    if (($nowTimestamp - $lastPostMarketRun) >= 300) { // 5 minutes
        SystemSetting::set('schedule_last_post_market_refresh', (string) $nowTimestamp);
        SystemSetting::set('post_market_attempts', (string) ($postMarketAttempts + 1));
        return true;
    }

    return false;
})->everyMinute();

// ریست تنظیمات بعد از بازار در شروع روز جدید
Schedule::command('symbols:refresh --reset-post-market')->when(function () {
    $startTime = SystemSetting::get('schedule_start_time');
    if (!$startTime) {
        return false;
    }

    $now = now()->timezone('Asia/Tehran')->format('H:i');

    // اجرا در دقیقه دقیق شروع بازار
    if ($now !== $startTime) {
        return false;
    }

    // فقط یکبار در روز اجرا شود
    $lastResetDate = SystemSetting::get('post_market_reset_date');
    $today = now()->timezone('Asia/Tehran')->format('Y-m-d');
    if ($lastResetDate === $today) {
        return false;
    }

    SystemSetting::set('post_market_reset_date', $today);
    return true;
})->everyMinute();

// ارسال روزانه SMS خلاصه پرتفو
Schedule::command('portfolio:sms-daily')->everyMinute();
