<?php

namespace App\Http\Controllers;

use App\Console\Commands\SendPortfolioDailySms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortfolioSmsCheckController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        try {
            $sent = SendPortfolioDailySms::sendDailyPortfolioSms();
            return response()->json(['data' => ['sent' => $sent]]);
        } catch (\Throwable $e) {
            return response()->json(['data' => ['sent' => 0, 'error' => $e->getMessage()]]);
        }
    }
}
