<?php

namespace App\Console\Commands;

use App\Models\PortfolioSmsSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Ippanel\Client as IPPanelClient;

class SendPortfolioDailySms extends Command
{
    protected $signature = 'portfolio:sms-daily';
    protected $description = 'ارسال روزانه SMS خلاصه پرتفو برای کاربران فعال';

    public function handle(): int
    {
        $sent = self::sendDailyPortfolioSms();
        $this->info("{$sent} portfolio SMS sent successfully.");
        return 0;
    }

    public static function sendDailyPortfolioSms(): int
    {
        $now = Carbon::now('Asia/Tehran');
        $currentTime = $now->format('H:i');
        $today = $now->format('Y-m-d');

        $settings = PortfolioSmsSetting::where('enabled', true)
            ->whereRaw("TIME(send_time) <= TIME(?)", [$currentTime . ':00'])
            ->with(['portfolio.user', 'portfolio.items'])
            ->get();

        $sent = 0;

        foreach ($settings as $setting) {
            try {
                $portfolio = $setting->portfolio;
                if (!$portfolio || !$portfolio->user) {
                    continue;
                }

                $user = $portfolio->user;
                if (!$user->phone || !$user->ippanel_api_key || !$user->ippanel_sender) {
                    continue;
                }

                // ابتدا لاگ ثبت می‌شود (Claim) تا درخواست‌های همزمان تکرار نفرستند
                try {
                    DB::table('portfolio_daily_sms_log')->insert([
                        'portfolio_sms_setting_id' => $setting->id,
                        'sent_date' => $today,
                        'sent_at' => $now->toDateTimeString(),
                    ]);
                } catch (\Throwable $e) {
                    // duplicate = قبلاً ارسال شده
                    continue;
                }

                $isToman = $user->unit === 'toman';
                $divider = $isToman ? 10 : 1;

                $usePortfolioCommission = !empty($portfolio->commission_enabled);
                $commissionEnabled = $usePortfolioCommission ? true : ($user->commission_enabled ?? false);
                $sellCommissionRate = $usePortfolioCommission
                    ? ($portfolio->sell_commission ?? 0.88) / 100
                    : ($user->sell_commission ?? 0.88) / 100;

                $unrealizedItems = $portfolio->items->filter(function ($item) {
                    return !($item->sell_price && $item->sell_price > 0);
                });

                $totalBuyValue = $unrealizedItems->sum(function ($item) {
                    return $item->buy_price * $item->quantity;
                }) / $divider;

                $totalCurrentValue = $unrealizedItems->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
                    $price = ($item->last_price && $item->last_price > 0) ? $item->last_price : $item->buy_price;
                    $raw = $price * $item->quantity;
                    $sellComm = $commissionEnabled ? $raw * $sellCommissionRate : 0;
                    return $raw - $sellComm;
                }) / $divider;

                $totalPL = $unrealizedItems->sum(function ($item) use ($commissionEnabled, $sellCommissionRate) {
                    if (!($item->last_price && $item->last_price > 0)) {
                        return 0;
                    }
                    $lastTotal = $item->last_price * $item->quantity;
                    $lastComm = $commissionEnabled ? $lastTotal * $sellCommissionRate : 0;
                    return ($lastTotal - $lastComm) - ($item->buy_price * $item->quantity);
                }) / $divider;

                $plPercent = $totalBuyValue > 0 ? ($totalPL / $totalBuyValue) * 100 : 0;
                $plSign = $totalPL > 0 ? '+' : ($totalPL < 0 ? '-' : '');
                $unit = $isToman ? 'تومان' : 'ریال';

                $message = $portfolio->name . " | ارزش: " . number_format($totalCurrentValue) . " {$unit}"
                    . " | سود/زیان: " . $plSign . number_format(abs($totalPL)) . " {$unit}"
                    . " (" . $plSign . number_format(abs($plPercent), 0) . "%" . ")";

                $client = new IPPanelClient($user->ippanel_api_key);
                $response = $client->sendWebservice(
                    $message,
                    $user->ippanel_sender,
                    [$user->phone]
                );

                if ($response->isSuccessful()) {
                    $sent++;
                    Log::info('Portfolio daily SMS sent', [
                        'user_id' => $user->id,
                        'portfolio_id' => $portfolio->id,
                    ]);
                } else {
                    // حذف لاگ تا درخواست بعدی دوباره تلاش کند
                    DB::table('portfolio_daily_sms_log')
                        ->where('portfolio_sms_setting_id', $setting->id)
                        ->where('sent_date', $today)
                        ->delete();
                    Log::warning('Portfolio daily SMS failed', [
                        'user_id' => $user->id,
                        'portfolio_id' => $portfolio->id,
                        'message' => $response->getMessage(),
                    ]);
                }
            } catch (\Throwable $e) {
                // حذف لاگ تا درخواست بعدی دوباره تلاش کند
                DB::table('portfolio_daily_sms_log')
                    ->where('portfolio_sms_setting_id', $setting->id)
                    ->where('sent_date', $today)
                    ->delete();
                Log::error('Portfolio daily SMS error', [
                    'setting_id' => $setting->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $sent;
    }
}
