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
    $lastRun = cache()->get('schedule_last_symbols_refresh', 0);
    $now = now()->timestamp;
    if (($now - $lastRun) >= $totalSeconds) {
        cache()->put('schedule_last_symbols_refresh', $now, $totalSeconds + 60);
        return true;
    }
    return false;
})->everyMinute();