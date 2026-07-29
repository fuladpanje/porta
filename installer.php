<?php
/**
 * Porta - Web Installer
 * 
 * این فایل رو در public_html آپلود کنید
 * و آدرس دامنه‌تون رو در مرورگر باز کنید
 * مراحل نصب خودکار انجام میشه.
 */

session_start();

$STEP = isset($_GET['step']) ? (int)$_GET['step'] : 1;
$ERROR = '';
$SUCCESS = '';

// --- Helper Functions ---

function generateAppKey($length = 32) {
    $bytes = random_bytes($length);
    return 'base64:' . base64_encode($bytes);
}

function dbConnect($host, $db, $user, $pass) {
    try {
        $pdo = new PDO("mysql:host=$host", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$db`");
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

function writeEnvFile($data) {
    $path = __DIR__ . '/backend/.env';
    $content = '';
    foreach ($data as $key => $value) {
        $content .= "$key=$value\n";
    }
    return file_put_contents($path, $content) !== false;
}

function runMigrations($pdo) {
    $sqls = [
        // users
        "CREATE TABLE IF NOT EXISTS `users` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `email` VARCHAR(255) NOT NULL UNIQUE,
            `unit` VARCHAR(10) DEFAULT 'rial',
            `auto_switch` TINYINT(1) DEFAULT 1,
            `schedule_enabled` TINYINT(1) DEFAULT 0,
            `schedule_seconds` INT DEFAULT 0,
            `schedule_minutes` INT DEFAULT 0,
            `schedule_hours` INT DEFAULT 0,
            `commission_enabled` TINYINT(1) DEFAULT 0,
            `buy_commission` DECIMAL(5,2) DEFAULT 0.37,
            `sell_commission` DECIMAL(5,2) DEFAULT 0.88,
            `email_verified_at` TIMESTAMP NULL,
            `password` VARCHAR(255) NOT NULL,
            `remember_token` VARCHAR(100) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB",

        // portfolios
        "CREATE TABLE IF NOT EXISTS `portfolios` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `user_id` BIGINT UNSIGNED NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // portfolio_items
        "CREATE TABLE IF NOT EXISTS `portfolio_items` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `portfolio_id` BIGINT UNSIGNED NOT NULL,
            `symbol` VARCHAR(255) NOT NULL,
            `last_price` DECIMAL(12,2) NULL,
            `pe` DECIMAL(12,2) NULL,
            `buy_price` DECIMAL(12,2) NOT NULL,
            `quantity` DECIMAL(12,4) NOT NULL,
            `sell_price` DECIMAL(12,2) NULL,
            `resistance_1` DECIMAL(12,2) NULL,
            `resistance_2` DECIMAL(12,2) NULL,
            `resistance_3` DECIMAL(12,2) NULL,
            `support_1` DECIMAL(12,2) NULL,
            `support_2` DECIMAL(12,2) NULL,
            `support_3` DECIMAL(12,2) NULL,
            `active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // api_keys
        "CREATE TABLE IF NOT EXISTS `api_keys` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `user_id` BIGINT UNSIGNED NOT NULL,
            `name` VARCHAR(255) NOT NULL,
            `api_key` TEXT NOT NULL,
            `is_default` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // sessions
        "CREATE TABLE IF NOT EXISTS `sessions` (
            `id` VARCHAR(255) PRIMARY KEY,
            `user_id` BIGINT UNSIGNED NULL,
            `ip_address` VARCHAR(45) NULL,
            `user_agent` TEXT NULL,
            `payload` LONGTEXT NOT NULL,
            `last_activity` INT NOT NULL,
            INDEX `sessions_user_id_index` (`user_id`),
            INDEX `sessions_last_activity_index` (`last_activity`)
        ) ENGINE=InnoDB",

        // personal_access_tokens
        "CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `tokenable_type` VARCHAR(255) NOT NULL,
            `tokenable_id` BIGINT UNSIGNED NOT NULL,
            `name` TEXT NOT NULL,
            `token` VARCHAR(64) NOT NULL UNIQUE,
            `abilities` TEXT NULL,
            `last_used_at` TIMESTAMP NULL,
            `expires_at` TIMESTAMP NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`)
        ) ENGINE=InnoDB",

        // migrations (for Laravel tracking)
        "CREATE TABLE IF NOT EXISTS `migrations` (
            `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `migration` VARCHAR(255) NOT NULL,
            `batch` INT NOT NULL
        ) ENGINE=InnoDB",
    ];

    foreach ($sqls as $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException $e) {
            // Table might already exist, continue
        }
    }

    // Mark all migrations as complete
    $migrations = [
        '2024_01_01_000000_create_users_table',
        '2024_01_02_000000_create_portfolios_table',
        '2024_01_03_000000_create_portfolio_items_table',
        '2026_07_26_171857_create_sessions_table',
        '2026_07_26_184816_create_personal_access_tokens_table',
        '2026_07_27_000000_add_active_to_portfolio_items_table',
        '2026_07_27_230946_add_unit_to_users_table',
        '2026_07_28_000000_add_last_price_to_portfolio_items_table',
        '2026_07_28_073414_add_auto_switch_to_users_table',
        '2026_07_28_104600_create_api_keys_table',
        '2026_07_28_131151_add_schedule_to_users_table',
        '2026_07_28_140500_add_pe_to_portfolio_items_table',
        '2026_07_29_000000_add_commission_to_users_table',
    ];

    $pdo->exec("TRUNCATE TABLE `migrations`");
    $stmt = $pdo->prepare("INSERT INTO `migrations` (`migration`, `batch`) VALUES (?, 1)");
    foreach ($migrations as $m) {
        $stmt->execute([$m]);
    }

    return true;
}

// --- Process Form Submission ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    set_time_limit(120);
    if ($STEP === 2) {
        $host = trim($_POST['db_host'] ?? '127.0.0.1');
        $dbname = trim($_POST['db_name'] ?? '');
        $dbuser = trim($_POST['db_user'] ?? '');
        $dbpass = $_POST['db_pass'] ?? '';
        $domain = trim($_POST['domain'] ?? '');
        $admin_name = trim($_POST['admin_name'] ?? '');
        $admin_email = trim($_POST['admin_email'] ?? '');
        $admin_pass = $_POST['admin_pass'] ?? '';

        if (empty($dbname) || empty($dbuser) || empty($domain) || empty($admin_name) || empty($admin_email) || empty($admin_pass)) {
            $ERROR = 'لطفاً تمام فیلدها را پر کنید.';
        } else {
            $pdo = dbConnect($host, $dbname, $dbuser, $dbpass);
            if (!$pdo) {
                $ERROR = 'اتصال به دیتابیس ناموفق بود. اطلاعات را بررسی کنید.';
            } else {
                // Save to session for step 3
                $_SESSION['install'] = [
                    'host' => $host,
                    'db_name' => $dbname,
                    'db_user' => $dbuser,
                    'db_pass' => $dbpass,
                    'domain' => $domain,
                    'admin_name' => $admin_name,
                    'admin_email' => $admin_email,
                    'admin_pass' => $admin_pass,
                ];
                header('Location: installer.php?step=3');
                exit;
            }
        }
    }

if ($STEP === 3) {
    set_time_limit(60);
    $data = $_SESSION['install'] ?? null;
        if (!$data) {
            header('Location: installer.php?step=1');
            exit;
        }

        $pdo = dbConnect($data['host'], $data['db_name'], $data['db_user'], $data['db_pass']);
        if (!$pdo) {
            $ERROR = 'اتصال به دیتابیس ناموفق بود.';
            $STEP = 2;
        } else {
            // Build errors string to collect all issues
            $errs = [];

            // 1. Run migrations
        try { runMigrations($pdo); } catch (Exception $e) { $errs[] = 'Migration failed: ' . $e->getMessage(); }

        // 2. Generate APP_KEY
        $appKey = generateAppKey();

        // 3. Write .env
        $envData = [
            'APP_NAME' => 'Porta',
            'APP_ENV' => 'production',
            'APP_KEY' => $appKey,
            'APP_DEBUG' => 'false',
            'APP_URL' => 'https://' . $data['domain'],
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $data['host'],
            'DB_PORT' => '3306',
            'DB_DATABASE' => $data['db_name'],
            'DB_USERNAME' => $data['db_user'],
            'DB_PASSWORD' => $data['db_pass'],
            'BROADCAST_DRIVER' => 'log',
            'CACHE_DRIVER' => 'file',
            'FILESYSTEM_DISK' => 'local',
            'QUEUE_CONNECTION' => 'sync',
            'SESSION_DRIVER' => 'database',
            'SESSION_LIFETIME' => '120',
            'SANCTUM_STATEFUL_DOMAINS' => $data['domain'],
            'SANCTUM_COLLISION_HASH_LENGTH' => '16',
            'BRS_API_KEY' => '',
        ];
        if (!writeEnvFile($envData)) { $errs[] = 'Failed to write .env file'; }

        // 4. Create admin user
        try {
            $hash = password_hash($data['admin_pass'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO `users` (`name`, `email`, `password`, `created_at`, `updated_at`) VALUES (?, ?, ?, NOW(), NOW())");
            $stmt->execute([$data['admin_name'], $data['admin_email'], $hash]);
        } catch (Exception $e) { $errs[] = 'Failed to create admin: ' . $e->getMessage(); }

        // 5. Set permissions (skip vendor to avoid timeout)
        $storagePath = __DIR__ . '/backend/storage';
        $cachePath = __DIR__ . '/backend/bootstrap/cache';
        foreach ([$storagePath, $cachePath] as $p) {
            if (is_dir($p)) @chmod($p, 0755);
        }
        $dirs = [$storagePath . '/framework', $storagePath . '/logs', $cachePath];
        foreach ($dirs as $d) { if (is_dir($d)) @chmod($d, 0755); }

        // 6. Handle result
        if (!empty($errs)) {
            $ERROR = 'Installation completed with errors: ' . implode(' | ', $errs);
        } else {
            $SUCCESS = 'نصب با موفقیت انجام شد!';
            header('Location: installer.php?step=4');
            exit;
        }
        }
    }
}
function chmodRecursive($dir, $mode) {
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        is_dir($path) ? chmodRecursive($path, $mode) : chmod($path, $mode);
    }
    chmod($dir, $mode);
}

// --- Check if already installed ---
if (file_exists(__DIR__ . '/backend/.env')) {
    $envContent = file_get_contents(__DIR__ . '/backend/.env');
    if (strpos($envContent, 'APP_KEY=base64:') !== false && $STEP === 1) {
        $STEP = 5; // Already installed
    }
}

// --- Check requirements ---
$requirements = [];
if (version_compare(PHP_VERSION, '8.2.0', '<')) {
    $requirements[] = ['PHP 8.2+', false, PHP_VERSION];
} else {
    $requirements[] = ['PHP 8.2+', true, PHP_VERSION];
}
$extensions = ['openssl', 'pdo', 'mbstring', 'json', 'curl', 'fileinfo', 'gd'];
foreach ($extensions as $ext) {
    $requirements[] = ["Extension: $ext", extension_loaded($ext), ''];
}

$writablePaths = [
    __DIR__ . '/backend/storage',
    __DIR__ . '/backend/storage/framework',
    __DIR__ . '/backend/storage/framework/sessions',
    __DIR__ . '/backend/storage/framework/views',
    __DIR__ . '/backend/storage/framework/cache',
    __DIR__ . '/backend/storage/logs',
    __DIR__ . '/backend/bootstrap/cache',
];

// Create directories if they don't exist
foreach ($writablePaths as $p) {
    if (!is_dir($p)) @mkdir($p, 0755, true);
}

$allReqsMet = true;
foreach ($requirements as $req) {
    if (!$req[1]) $allReqsMet = false;
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نصب Porta</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Vazirmatn', sans-serif;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .installer {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 550px;
            color: #fff;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .header p {
            color: rgba(255,255,255,0.5);
            font-size: 0.9rem;
        }

        .steps {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 30px;
        }

        .step-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            transition: all 0.3s;
        }

        .step-dot.active {
            background: #667eea;
            box-shadow: 0 0 10px rgba(102,126,234,0.5);
        }

        .step-dot.done {
            background: #4ade80;
        }

        .form-group {
            margin-bottom: 18px;
        }

        .form-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.85rem;
            color: rgba(255,255,255,0.7);
            font-weight: 500;
        }

        .form-group input {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            color: #fff;
            font-family: 'Vazirmatn', sans-serif;
            font-size: 0.9rem;
            direction: ltr;
            text-align: left;
            transition: border-color 0.3s;
        }

        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        .form-group input::placeholder {
            color: rgba(255,255,255,0.3);
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 12px;
            font-family: 'Vazirmatn', sans-serif;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102,126,234,0.4);
        }

        .btn-success {
            background: linear-gradient(135deg, #4ade80, #22c55e);
            color: #fff;
        }

        .error {
            background: rgba(239,68,68,0.15);
            border: 1px solid rgba(239,68,68,0.3);
            color: #fca5a5;
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 0.85rem;
            text-align: center;
        }

        .success {
            background: rgba(74,222,128,0.15);
            border: 1px solid rgba(74,222,128,0.3);
            color: #86efac;
            padding: 12px 16px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 0.85rem;
            text-align: center;
        }

        .req-list {
            list-style: none;
            margin: 20px 0;
        }

        .req-list li {
            padding: 10px 14px;
            margin-bottom: 6px;
            border-radius: 8px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .req-list li.pass {
            background: rgba(74,222,128,0.1);
            color: #86efac;
        }

        .req-list li.fail {
            background: rgba(239,68,68,0.1);
            color: #fca5a5;
        }

        .req-list li .icon { font-size: 1rem; }

        .divider {
            height: 1px;
            background: rgba(255,255,255,0.1);
            margin: 25px 0;
        }

        .info-box {
            background: rgba(102,126,234,0.1);
            border: 1px solid rgba(102,126,234,0.2);
            border-radius: 10px;
            padding: 16px;
            margin: 20px 0;
            font-size: 0.85rem;
            color: rgba(255,255,255,0.7);
            line-height: 1.8;
        }

        .info-box strong {
            color: #667eea;
        }

        .final-box {
            text-align: center;
            padding: 20px 0;
        }

        .final-box .check {
            font-size: 4rem;
            margin-bottom: 16px;
        }

        .final-box h2 {
            font-size: 1.5rem;
            margin-bottom: 12px;
            color: #4ade80;
        }

        .final-box p {
            color: rgba(255,255,255,0.6);
            margin-bottom: 8px;
            font-size: 0.9rem;
        }

        .final-box a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }

        .final-box .warning {
            background: rgba(251,191,36,0.1);
            border: 1px solid rgba(251,191,36,0.2);
            color: #fde68a;
            padding: 12px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="installer">
        <div class="header">
            <h1>Porta</h1>
            <p>نصب‌کننده خودکار</p>
        </div>

        <div class="steps">
            <div class="step-dot <?= $STEP >= 1 ? ($STEP > 1 ? 'done' : 'active') : '' ?>"></div>
            <div class="step-dot <?= $STEP >= 2 ? ($STEP > 2 ? 'done' : 'active') : '' ?>"></div>
            <div class="step-dot <?= $STEP >= 3 ? ($STEP > 3 ? 'done' : 'active') : '' ?>"></div>
            <div class="step-dot <?= $STEP >= 4 ? 'done' : '' ?>"></div>
        </div>

        <?php if ($ERROR): ?>
            <div class="error"><?= htmlspecialchars($ERROR) ?></div>
        <?php endif; ?>

        <?php if ($SUCCESS): ?>
            <div class="success"><?= htmlspecialchars($SUCCESS) ?></div>
        <?php endif; ?>

        <!-- STEP 1: Requirements Check -->
        <?php if ($STEP === 1): ?>
            <div class="info-box">
                <strong>خوش آمدید!</strong><br>
                این ابزار نصب، به صورت خودکار برنامه را روی هاست شما راه‌اندازی می‌کند.
            </div>

            <ul class="req-list">
                <?php foreach ($requirements as $req): ?>
                    <li class="<?= $req[1] ? 'pass' : 'fail' ?>">
                        <span class="icon"><?= $req[1] ? '✓' : '✗' ?></span>
                        <?= $req[0] ?>
                        <?php if ($req[2]): ?>
                            <span style="margin-right:auto;opacity:0.5;font-size:0.75rem"><?= $req[2] ?></span>
                        <?php endif; ?>
                    </li>
                <?php endforeach; ?>
            </ul>

            <?php if ($allReqsMet): ?>
                <a href="installer.php?step=2" style="text-decoration:none">
                    <button class="btn btn-primary">مرحله بعد →</button>
                </a>
            <?php else: ?>
                <div class="error">لطفاً ابتدا مشکلات بالا را برطرف کنید.</div>
            <?php endif; ?>

        <!-- STEP 2: Database & Domain Config -->
        <?php elseif ($STEP === 2): ?>
            <form method="POST" action="installer.php?step=2">
                <div class="info-box">
                    <strong>تنظیمات دیتابیس:</strong><br>
                    اطلاعات دیتابیس را از بخش <strong>MySQL Databases</strong> در cPanel پیدا کنید.
                </div>

                <div class="form-group">
                    <label>آدرس دامنه (بدون https://)</label>
                    <input type="text" name="domain" placeholder="example.com" required
                           value="<?= htmlspecialchars($_POST['domain'] ?? '') ?>">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>آدرس سرور دیتابیس</label>
                        <input type="text" name="db_host" value="127.0.0.1" required>
                    </div>
                    <div class="form-group">
                        <label>نام دیتابیس</label>
                        <input type="text" name="db_name" placeholder="my_database" required
                               value="<?= htmlspecialchars($_POST['db_name'] ?? '') ?>">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>نام کاربری دیتابیس</label>
                        <input type="text" name="db_user" placeholder="db_user" required
                               value="<?= htmlspecialchars($_POST['db_user'] ?? '') ?>">
                    </div>
                    <div class="form-group">
                        <label>رمز عبور دیتابیس</label>
                        <input type="password" name="db_pass" placeholder="••••••••" required>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="info-box">
                    <strong>حساب مدیر:</strong><br>
                    این اطلاعات برای ورود به پنل مدیریت استفاده می‌شود.
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>نام مدیر</label>
                        <input type="text" name="admin_name" placeholder="مدیر" required
                               value="<?= htmlspecialchars($_POST['admin_name'] ?? '') ?>">
                    </div>
                    <div class="form-group">
                        <label>ایمیل مدیر</label>
                        <input type="email" name="admin_email" placeholder="admin@example.com" required
                               value="<?= htmlspecialchars($_POST['admin_email'] ?? '') ?>">
                    </div>
                </div>

                <div class="form-group">
                    <label>رمز عبور مدیر</label>
                    <input type="password" name="admin_pass" placeholder="حداقل ۸ کاراکتر" required minlength="8">
                </div>

                <button type="submit" class="btn btn-primary">نصب کن →</button>
            </form>

        <!-- STEP 3: Installing -->
        <?php elseif ($STEP === 3): ?>
            <form method="POST" action="installer.php?step=3" id="autoInstall">
                <input type="hidden" name="run" value="1">
            </form>
            <div style="text-align:center;padding:40px 0">
                <div style="font-size:3rem;animation:pulse 1s infinite">⚙️</div>
                <p style="margin-top:16px;color:rgba(255,255,255,0.7)">در حال نصب...</p>
            </div>
            <script>document.getElementById('autoInstall').submit();</script>

        <!-- STEP 4: Success -->
        <?php elseif ($STEP === 4): ?>
            <div class="final-box">
                <div class="check">✅</div>
                <h2>نصب با موفقیت انجام شد!</h2>
                <p>اکنون می‌توانید وارد پنل مدیریت شوید.</p>
                <p style="margin-top:12px">
                    <a href="https://<?= htmlspecialchars($_SESSION['install']['domain'] ?? 'yourdomain.com') ?>/" target="_blank">
                        ورود به سایت →
                    </a>
                </p>

                <div class="warning">
                    ⚠️ <strong>مهم:</strong> فایل <code>installer.php</code> را از روی سرور حذف کنید!
                </div>
            </div>

        <!-- STEP 5: Already Installed -->
        <?php elseif ($STEP === 5): ?>
            <div class="final-box">
                <div class="check">🔒</div>
                <h2>نصب قبلاً انجام شده</h2>
                <p>فایل .env وجود دارد و برنامه نصب شده است.</p>
                <p style="margin-top:12px">
                    <a href="./" target="_blank">رفتن به سایت →</a>
                </p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
