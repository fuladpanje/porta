<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DebugController extends Controller
{
    public function showRefreshLog(Request $request): Response
    {
        $secret = $request->query('key', '');
        $expected = config('app.debug_key', env('APP_DEBUG_KEY', 'porta-debug-2024'));

        if ($secret !== $expected) {
            abort(403, 'Forbidden');
        }

        $logPath = storage_path('logs/refresh-debug.log');
        $content = '';
        if (file_exists($logPath)) {
            $content = file_get_contents($logPath);
        }

        $lines = array_filter(explode("\n", trim($content)));

        if ($request->query('clear')) {
            @file_put_contents($logPath, '');
            $content = '';
            $lines = [];
        }

        $lastModified = file_exists($logPath) ? date('Y-m-d H:i:s', filemtime($logPath)) : '-';
        $lineCount = count($lines);

        $html = '<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Porta Debug</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Courier New", monospace; background: #0d1117; color: #c9d1d9; padding: 20px; }
        h1 { color: #58a6ff; margin-bottom: 8px; font-size: 18px; }
        .meta { color: #8b949e; font-size: 12px; margin-bottom: 16px; }
        .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; text-decoration: none; color: #fff; font-family: inherit; }
        .btn-green { background: #238636; }
        .btn-green:hover { background: #2ea043; }
        .btn-blue { background: #1f6feb; }
        .btn-blue:hover { background: #388bfd; }
        .btn-red { background: #da3633; }
        .btn-red:hover { background: #f85149; }
        .btn-gray { background: #484f58; }
        .btn-gray:hover { background: #6e7681; }
        .log-container { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; overflow-x: auto; max-height: 80vh; overflow-y: auto; }
        .log-line { padding: 3px 0; border-bottom: 1px solid #21262d; font-size: 12px; white-space: pre-wrap; word-break: break-all; line-height: 1.5; }
        .log-line:last-child { border-bottom: none; }
        .s-START { color: #f0883e; font-weight: bold; }
        .s-STEP1, .s-STEP2, .s-STEP3, .s-STEP4, .s-STEP4B, .s-STEP5, .s-STEP6 { color: #7ee787; }
        .s-ITEM { color: #d2a8ff; }
        .s-DONE { color: #58a6ff; font-weight: bold; }
        .s-ERROR { color: #f85149; font-weight: bold; background: #f8514922; padding: 2px 6px; border-radius: 3px; display: inline; }
        .s-INFO { color: #d2a8ff; }
        .empty { color: #8b949e; text-align: center; padding: 40px; }
        .separator { color: #30363d; padding: 4px 0; text-align: center; font-size: 11px; }
        #spinner { display: none; color: #f0883e; font-size: 12px; }
    </style>
</head>
<body>
    <h1>Porta Debug - Refresh Log</h1>
    <div class="meta">
        خطوط: ' . $lineCount . ' &mdash; آخرین تغییر: ' . $lastModified . '
        <span id="spinner">در حال رفرش...</span>
    </div>
    <div class="toolbar">
        <button class="btn btn-green" onclick="triggerRefresh()">رفرش قیمت‌ها</button>
        <button class="btn btn-blue" onclick="location.reload()">رفرش صفحه</button>
        <button class="btn btn-gray" onclick="toggleAuto()">Auto: <span id="autoLabel">OFF</span></button>
        <a href="?key=' . e($secret) . '&clear=1" class="btn btn-red" onclick="return confirm(\'لاگ پاک بشه؟\')">پاک کردن</a>
    </div>';

        if (empty($lines)) {
            $html .= '<div class="log-container"><div class="empty">لاگ خالی است. دکمه «رفرش قیمت‌ها» رو بزنید.</div></div>';
        } else {
            $html .= '<div class="log-container" id="logBox">';
            $lastReq = '';
            foreach ($lines as $line) {
                preg_match('/\[req:([a-f0-9]+)\]/', $line, $reqMatch);
                $currentReq = $reqMatch[1] ?? '';
                if ($currentReq && $currentReq !== $lastReq && $lastReq !== '') {
                    $html .= '<div class="separator">───────────</div>';
                }
                if ($currentReq) $lastReq = $currentReq;

                $escaped = htmlspecialchars($line);
                $class = 'log-line';
                if (preg_match('/\[(START|STEP\d+?|STEP\d+B|ITEM|DONE|ERROR|INFO)\]/', $line, $m)) {
                    $class .= ' s-' . $m[1];
                }
                $html .= "<div class=\"$class\">$escaped</div>";
            }
            $html .= '</div>';
        }

        $html .= '
    <script>
        let autoMode = false;
        let autoTimer = null;

        function toggleAuto() {
            autoMode = !autoMode;
            document.getElementById("autoLabel").textContent = autoMode ? "ON (3s)" : "OFF";
            if (autoMode) {
                autoTimer = setInterval(function() { location.reload(); }, 3000);
            } else {
                clearInterval(autoTimer);
            }
        }

        async function triggerRefresh() {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("توکن یافت نشد. اول لاگین کنید.");
                return;
            }
            document.getElementById("spinner").style.display = "inline";
            try {
                const res = await fetch("/api/stocks/refresh", {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ manual: true })
                });
                const data = await res.json();
                document.getElementById("spinner").style.display = "none";
                alert(res.ok ? "موفق! آپدیت شد: " + (data.updated || 0) + " آیتم" : "خطا " + res.status + ": " + (data.message || ""));
                location.reload();
            } catch (e) {
                document.getElementById("spinner").style.display = "none";
                alert("خطا: " + e.message);
            }
        }

        // Auto scroll to bottom
        const logBox = document.getElementById("logBox");
        if (logBox) logBox.scrollTop = logBox.scrollHeight;
    </script>
</body>
</html>';

        return response($html)->header('Content-Type', 'text/html; charset=utf-8');
    }
}
