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
        $now = now()->format('H:i');
        $inRange = ($startTime <= $endTime)
            ? ($now >= $startTime && $now <= $endTime)
            : ($now >= $startTime || $now <= $endTime);

        if (!$inRange) {
            return false;
        }
    }

    // Use database instead of cache for reliability on shared hosting
    $lastRun      = (int) SystemSetting::get('schedule_last_symbols_refresh', '0');
    $nowTimestamp = now()->timestamp;

    if (($nowTimestamp - $lastRun) >= $totalSeconds) {
        SystemSetting::set('schedule_last_symbols_refresh', (string) $nowTimestamp);
        return true;
    }

    return false;
})->everyMinute();
