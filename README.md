<p align="center">
  <img src="frontend/public/favicon.svg" width="100" alt="پورتا">
</p>

<h1 align="center">پورتا | Porta</h1>

<p align="center">
  <a href="#نسخه-فارسی">🇮🇷 فارسی</a> •
  <a href="#english-version">🇺🇸 English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?style=flat-square&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT">
</p>

<p align="center">
  <img src="porta-scr.jpg" alt="Porta Screenshot" width="100%">
</p>

---

<a id="نسخه-فارسی"></a>

# 🇮🇷 نسخه فارسی

<p align="center">
  یک داشبورد حرفه‌ای RTL برای مدیریت پورتفولیوی سهام بورس ایران
</p>

## ویژگی‌ها

- مدیریت چند پورتفولیو با نام‌های دلخواه
- اضافه/ویرایش/حذف سهام در هر پورتفولیو
- محاسبه خودکار سود و زیان (با احتساب کارمزد)
- درصد سود/زیان نسبت به قیمت خرید
- نمودار قیمت با سطوح مقاومت و حمایت
- بروزرسانی خودکار قیمت از وب‌سرویس بورس (BRS API)
- جستجوی نمادها در بازار بورس ایران
- نمایش KPIهای پورتفولیو (ارزش کل، سود/زیان، درصد تغییر)
- حالت تاریک و روشن
- پشتیبانی کامل RTL و زبان فارسی
- طراحی ریسپانسیو (موبایل، تبلت، دسکتاپ)
- واحد پول ریال/تومان
- کارمزد خرید/فروش قابل تنظیم

## دانلود

1. به صفحه [Release‌ها](https://github.com/fuladpanje/porta/releases) بروید
2. آخرین Release را پیدا کنید و فایل **porta-deploy.zip** را دانلود کنید
3. فایل ZIP را از حالت فشرده خارج کنید و محتوایش را به `public_html/` سایت خود آپلود کنید

## نصب روی هاست cPanel

> بدون نیاز به SSH!

فایل‌های داخل پوشه `deploy/` را به `public_html/` آپلود کنید:

```
public_html/
├── backend/
│   ├── public/   ← نقطه ورود Laravel
│   └── ...
└── database.sql  ← ایمپورت در phpMyAdmin
```

1. در cPanel یک دیتابیس بسازید و یک کاربر به آن اختصاص دهید
2. در phpMyAdmin، دیتابیس را انتخاب کرده و `database.sql` را ایمپورت کنید
3. Document Root را به `backend/public` تغییر دهید
4. سطح دسترسی `storage/` و `bootstrap/cache/` را `755` قرار دهید
5. فایل `.env` را ویرایش کنید:

```env
DB_DATABASE=نام_دیتابیس
DB_USERNAME=نام_کاربر
DB_PASSWORD=رمز_عبور
APP_URL=https://example.com
SANCTUM_STATEFUL_DOMAINS=example.com
```

6. تست کنید 🎉

## API

| Method | Endpoint | توضیح |
|--------|----------|-------|
| POST | `/api/register` | ثبت‌نام |
| POST | `/api/login` | ورود |
| POST | `/api/logout` | خروج |
| GET | `/api/user` | اطلاعات کاربر |
| PUT | `/api/user/unit` | تغییر واحد پول |
| PUT | `/api/user/auto-switch` | سوییچ خودکار |
| PUT | `/api/user/schedule` | زمان‌بندی |
| PUT | `/api/user/fee-settings` | تنظیم کارمزد |
| GET/POST | `/api/portfolios` | لیست/ساخت پورتفولیو |
| GET/PUT/DELETE | `/api/portfolios/{id}` | مدیریت پورتفولیو |
| GET/POST | `/api/portfolios/{id}/items` | آیتم‌ها |
| PUT/DELETE | `/api/portfolios/{id}/items/{itemId}` | مدیریت سهم |
| GET | `/api/dashboard` | داشبورد |
| PUT | `/api/portfolios/{id}/fee-settings` | کارمزد اختصاصی |
| PUT | `/api/portfolios/{id}/toggle-active` | فعال/غیرفعال |
| POST | `/api/stocks/refresh` | بروزرسانی قیمت |
| GET | `/api/stocks/symbols?q=` | جستجوی نماد |
| GET/POST | `/api/api-keys` | کلیدهای API |
| PUT/DELETE | `/api/api-keys/{id}` | ویرایش/حذف کلید |
| POST | `/api/api-keys/{id}/default` | کلید پیش‌فرض |

## ساختار دیتابیس

### جدول `users`

| ستون | نوع | پیش‌فرض | توضیح |
|------|------|---------|-------|
| `id` | bigint (PK) | — | شناسه |
| `name` | string | — | نام کاربر |
| `email` | string (unique) | — | ایمیل |
| `unit` | string(10) | `rial` | واحد پول (rial/toman) |
| `auto_switch` | boolean | `true` | سوییچ خودکار قیمت |
| `schedule_enabled` | boolean | `false` | فعال‌سازی زمان‌بندی |
| `schedule_seconds` | integer | `0` | ثانیه زمان‌بندی |
| `schedule_minutes` | integer | `0` | دقیقه زمان‌بندی |
| `schedule_hours` | integer | `0` | ساعت زمان‌بندی |
| `commission_enabled` | boolean | `false` | فعال‌سازی کارمزد |
| `buy_commission` | decimal(5,2) | `0.37` | کارمزد خرید (%) |
| `sell_commission` | decimal(5,2) | `0.88` | کارمزد فروش (%) |
| `email_verified_at` | timestamp | `null` | زمان تأیید ایمیل |
| `password` | string | — | رمز عور |
| `remember_token` | string | — | توکن مرا به خاطر بسپار |
| `created_at` / `updated_at` | timestamp | — | زمان ایجاد/ویرایش |

### جدول `portfolios`

| ستون | نوع | پیش‌فرض | توضیح |
|------|------|---------|-------|
| `id` | bigint (PK) | — | شناسه |
| `user_id` | bigint (FK → users) | — | مالک پرتفو (حذفCascade) |
| `name` | string | — | نام پرتفو |
| `commission_enabled` | boolean | `false` | کارمزد اختصاصی |
| `buy_commission` | decimal(5,2) | `0.37` | کارمزد خرید اختصاصی |
| `sell_commission` | decimal(5,2) | `0.88` | کارمزد فروش اختصاصی |
| `active` | boolean | `true` | فعال/غیرفعال |
| `created_at` / `updated_at` | timestamp | — | زمان ایجاد/ویرایش |

### جدول `portfolio_items`

| ستون | نوع | پیش‌فرض | توضیح |
|------|------|---------|-------|
| `id` | bigint (PK) | — | شناسه |
| `portfolio_id` | bigint (FK → portfolios) | — | مالک (حذف Cascade) |
| `symbol` | string | — | نماد بورسی |
| `last_price` | decimal(12,2) | `null` | آخرین قیمت |
| `pe` | decimal(12,2) | `null` | نسبت P/E |
| `buy_price` | decimal(12,2) | — | قیمت خرید |
| `quantity` | decimal(12,4) | — | تعداد سهم |
| `sell_price` | decimal(12,2) | `null` | قیمت فروش |
| `resistance_1` | decimal(12,2) | `null` | مقاومت اول |
| `resistance_2` | decimal(12,2) | `null` | مقاومت دوم |
| `resistance_3` | decimal(12,2) | `null` | مقاومت سوم |
| `support_1` | decimal(12,2) | `null` | حمایت اول |
| `support_2` | decimal(12,2) | `null` | حمایت دوم |
| `support_3` | decimal(12,2) | `null` | حمایت سوم |
| `active` | boolean | `true` | فعال/غیرفعال |
| `created_at` / `updated_at` | timestamp | — | زمان ایجاد/ویرایش |

### جدول `api_keys`

| ستون | نوع | پیش‌فرض | توضیح |
|------|------|---------|-------|
| `id` | bigint (PK) | — | شناسه |
| `user_id` | bigint (FK → users) | — | مالک (حذف Cascade) |
| `name` | string | — | نام کلید |
| `api_key` | text | — | کلید API |
| `is_default` | boolean | `false` | کلید پیش‌فرض |
| `daily_requests` | integer | `0` | تعداد درخواست‌های روزانه |
| `last_reset_at` | timestamp | `null` | آخرین زمان ریست شمارنده |
| `created_at` / `updated_at` | timestamp | — | زمان ایجاد/ویرایش |

### جدول `favorites`

| ستون | نوع | پیش‌فرض | توضیح |
|------|------|---------|-------|
| `id` | bigint (PK) | — | شناسه |
| `user_id` | bigint (FK → users) | — | مالک (حذف Cascade) |
| `symbol` | string | — | نماد مورد علاقه |
| `created_at` / `updated_at` | timestamp | — | زمان ایجاد/ویرایش |

> Unique: (`user_id`, `symbol`)

### جدول `sessions` (Laravel)

| ستون | نوع | توضیح |
|------|------|-------|
| `id` | string (PK) | شناسه نشست |
| `user_id` | bigint (nullable) | کاربر |
| `ip_address` | string(45) | آی‌پی |
| `user_agent` | text | مرورگر |
| `payload` | longText | داده نشست |
| `last_activity` | integer | آخرین فعالیت |

### جدول `personal_access_tokens` (Sanctum)

| ستون | نوع | توضیح |
|------|------|-------|
| `id` | bigint (PK) | شناسه |
| `tokenable_type` / `tokenable_id` | — | مدل مرتبط |
| `name` | text | نام توکن |
| `token` | string(64, unique) | توکن |
| `abilities` | text | سطوح دسترسی |
| `last_used_at` | timestamp | آخرین استفاده |
| `expires_at` | timestamp | تاریخ انقضا |
| `created_at` / `updated_at` | timestamp | زمان ایجاد/ویرایش |

---

<a id="english-version"></a>

# 🇺🇸 English Version

<p align="center">
  <em>A professional RTL dashboard for managing Tehran Stock Exchange portfolios</em>
</p>

## Features

- Multiple portfolio management with custom names
- Add/edit/delete stocks in each portfolio
- Automatic profit/loss calculation with commission
- Percentage profit/loss relative to buy price
- Price chart with support & resistance levels
- Auto price update from BRS API (Tehran Stock Exchange)
- Symbol search in Iran stock market
- Portfolio KPIs (total value, P/L, change %)
- Dark/Light mode
- Full RTL & Persian language support
- Responsive design (mobile, tablet, desktop)
- Rial/Toman currency unit
- Configurable buy/sell commission

## Download

1. Go to [Releases page](https://github.com/fuladpanje/porta/releases)
2. Find the latest release and download **porta-deploy.zip**
3. Extract and upload contents to your site's `public_html/`

## cPanel Installation

> No SSH required!

Upload `deploy/` folder contents to `public_html/`:

```
public_html/
├── backend/
│   ├── public/   ← Laravel entry point
│   └── ...
└── database.sql  ← Import in phpMyAdmin
```

1. Create a MySQL database in cPanel and assign a user
2. In phpMyAdmin, select the database and import `database.sql`
3. Set Document Root to `backend/public`
4. Set `storage/` and `bootstrap/cache/` permissions to `755`
5. Edit `.env` file:

```env
DB_DATABASE=YOUR_DB_NAME
DB_USERNAME=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
APP_URL=https://example.com
SANCTUM_STATEFUL_DOMAINS=example.com
```

6. Test it 🎉

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register |
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET | `/api/user` | User info |
| PUT | `/api/user/unit` | Change currency unit |
| PUT | `/api/user/auto-switch` | Auto switch config |
| PUT | `/api/user/schedule` | Schedule config |
| PUT | `/api/user/fee-settings` | Commission settings |
| GET/POST | `/api/portfolios` | List/Create portfolios |
| GET/PUT/DELETE | `/api/portfolios/{id}` | Manage portfolio |
| GET/POST | `/api/portfolios/{id}/items` | Portfolio items |
| PUT/DELETE | `/api/portfolios/{id}/items/{itemId}` | Manage stock |
| GET | `/api/dashboard` | Dashboard data |
| PUT | `/api/portfolios/{id}/fee-settings` | Portfolio fee settings |
| PUT | `/api/portfolios/{id}/toggle-active` | Toggle active |
| POST | `/api/stocks/refresh` | Refresh prices |
| GET | `/api/stocks/symbols?q=` | Search symbols |
| GET/POST | `/api/api-keys` | API keys |
| PUT/DELETE | `/api/api-keys/{id}` | Edit/Delete key |
| POST | `/api/api-keys/{id}/default` | Set default key |

## Database Schema

### `users` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | bigint (PK) | — | ID |
| `name` | string | — | User name |
| `email` | string (unique) | — | Email |
| `unit` | string(10) | `rial` | Currency (rial/toman) |
| `auto_switch` | boolean | `true` | Auto switch price |
| `schedule_enabled` | boolean | `false` | Schedule enabled |
| `schedule_seconds` | integer | `0` | Schedule seconds |
| `schedule_minutes` | integer | `0` | Schedule minutes |
| `schedule_hours` | integer | `0` | Schedule hours |
| `commission_enabled` | boolean | `false` | Commission enabled |
| `buy_commission` | decimal(5,2) | `0.37` | Buy commission (%) |
| `sell_commission` | decimal(5,2) | `0.88` | Sell commission (%) |
| `email_verified_at` | timestamp | `null` | Email verified at |
| `password` | string | — | Password |
| `remember_token` | string | — | Remember token |
| `created_at` / `updated_at` | timestamp | — | Timestamps |

### `portfolios` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | bigint (PK) | — | ID |
| `user_id` | bigint (FK → users) | — | Owner (cascade delete) |
| `name` | string | — | Portfolio name |
| `commission_enabled` | boolean | `false` | Custom commission |
| `buy_commission` | decimal(5,2) | `0.37` | Custom buy commission |
| `sell_commission` | decimal(5,2) | `0.88` | Custom sell commission |
| `active` | boolean | `true` | Active/inactive |
| `created_at` / `updated_at` | timestamp | — | Timestamps |

### `portfolio_items` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | bigint (PK) | — | ID |
| `portfolio_id` | bigint (FK → portfolios) | — | Owner (cascade delete) |
| `symbol` | string | — | Stock symbol |
| `last_price` | decimal(12,2) | `null` | Last price |
| `pe` | decimal(12,2) | `null` | P/E ratio |
| `buy_price` | decimal(12,2) | — | Buy price |
| `quantity` | decimal(12,4) | — | Quantity |
| `sell_price` | decimal(12,2) | `null` | Sell price |
| `resistance_1` | decimal(12,2) | `null` | Resistance 1 |
| `resistance_2` | decimal(12,2) | `null` | Resistance 2 |
| `resistance_3` | decimal(12,2) | `null` | Resistance 3 |
| `support_1` | decimal(12,2) | `null` | Support 1 |
| `support_2` | decimal(12,2) | `null` | Support 2 |
| `support_3` | decimal(12,2) | `null` | Support 3 |
| `active` | boolean | `true` | Active/inactive |
| `created_at` / `updated_at` | timestamp | — | Timestamps |

### `api_keys` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | bigint (PK) | — | ID |
| `user_id` | bigint (FK → users) | — | Owner (cascade delete) |
| `name` | string | — | Key name |
| `api_key` | text | — | API key |
| `is_default` | boolean | `false` | Default key |
| `daily_requests` | integer | `0` | Daily request count |
| `last_reset_at` | timestamp | `null` | Last counter reset time |
| `created_at` / `updated_at` | timestamp | — | Timestamps |

### `favorites` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | bigint (PK) | — | ID |
| `user_id` | bigint (FK → users) | — | Owner (cascade delete) |
| `symbol` | string | — | Favorite symbol |
| `created_at` / `updated_at` | timestamp | — | Timestamps |

> Unique: (`user_id`, `symbol`)

### `sessions` (Laravel)

| Column | Type | Description |
|--------|------|-------------|
| `id` | string (PK) | Session ID |
| `user_id` | bigint (nullable) | User |
| `ip_address` | string(45) | IP address |
| `user_agent` | text | Browser |
| `payload` | longText | Session data |
| `last_activity` | integer | Last activity |

### `personal_access_tokens` (Sanctum)

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint (PK) | ID |
| `tokenable_type` / `tokenable_id` | — | Related model |
| `name` | text | Token name |
| `token` | string(64, unique) | Token |
| `abilities` | text | Access levels |
| `last_used_at` | timestamp | Last used |
| `expires_at` | timestamp | Expiration |
| `created_at` / `updated_at` | timestamp | Timestamps |

---

## License

MIT License

---

<p align="center" dir="rtl">
  ساخته شده با ❤️ برای سرمایه‌گذاران بازار بورس ایران
</p>

<p align="center">
  <em>Made with ❤️ for Iran stock market investors</em>
</p>
