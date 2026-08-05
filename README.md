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
  <a href="https://porta.fuladpanjeh.ir/">🚀 مشاهده دمو &nbsp;|&nbsp; Live Demo</a>
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
- اعلان پیامکی هنگام رسیدن قیمت به سطوح مقاومت و حمایت

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

6. تست کنید

## تنظیم بروزرسانی خودکار (Cron Job)

بروزرسانی خودکار قیمت نمادها از طریق **Cron Job** در cPanel انجام می‌شود.

### تنظیم در cPanel

1. وارد **cPanel** شوید
2. بخش **Advanced** > **Cron Jobs** را باز کنید
3. یک Cron Job جدید با تنظیمات زیر اضافه کنید:

| فیلد | مقدار |
|------|-------|
| Minute | `*` |
| Hour | `*` |
| Day | `*` |
| Month | `*` |
| Weekday | `*` |

4. در فیلد **Command** وارد کنید:

```bash
cd /home/YOUR_USERNAME/public_html/example.com/backend && php artisan schedule:run >> /dev/null 2>&1
```

> مسیر بالا را بر اساس مسیر نصب ساب‌دومین خودتان تنظیم کنید.

### نقش ادمین

اولین کاربری که در سایت عضو شود، به صورت خودکار **ادمین** می‌شود. ادمین می‌تواند:

- **کلیدهای API** را اضافه، ویرایش و حذف کند
- **زمان‌بندی بروزرسانی خودکار** (ثانیه، دقیقه، ساعت) را تنظیم کند
- **بازه زمانی اجرا** (ساعت شروع و پایان) را مشخص کند

## اعلان پیامکی

سیستم اعلان پیامکی پورتا به کاربران اجازه می‌دهد هنگام رسیدن قیمت سهام به سطوح مقاومت و حمایت، از طریق پیامک مطلع شوند. این سرویس از وب‌سرویس **مدیر پیامک** (modirpayamak.com / IPPanel) استفاده می‌کند.

### نحوه کار

1. قیمت جدید سهام از BRS API دریافت می‌شود
2. سیستم بررسی می‌کند آیا قیمت جدید از سطح مقاومت بالاتر رفته یا از سطح حمایت پایین‌تر آمده
3. اگر عبور از سطح تشخیص داده شود و فاصله زمانی ارسال قبلی از cooldown تعیین‌شده بیشتر باشد، پیامک ارسال می‌شود
4. هر ارسال در دیتابیس ثبت می‌شود تا از ارسال تکراری جلوگیری شود

### پیامک‌های ارسالی

پیامک‌ها به صورت خودکار و با فرمت زیر ارسال می‌شوند:

- **عبور از مقاومت**: `{نماد} به مقاومت {سطح} رسید / فعلی: {قیمت} / مقاومت: {مقدار سطح}`
- **عبور از حمایت**: `{نماد} به حمایت {سطح} رسید / فعلی: {قیمت} / حمایت: {مقدار سطح}`

سطوح پشتیبانی شده: مقاومت ۱ و ۲ و حمایت ۱ و ۲

### تنظیمات کاربر

هر کاربر می‌تواند تنظیمات پیامک خود را در صفحه **تنظیمات** مدیریت کند:

| تنظیم | توضیح |
|--------|-------|
| فعال‌سازی پیامک | روشن/خاموش کردن اعلان پیامکی |
| شماره تلفن | شماره موبایل دریافت‌کننده پیامک |
| کلید API مدیر پیامک | کلید API وب‌سرویس مدیر پیامک |
| شماره فرستنده | شماره ارسال‌کننده پیامک (مثلاً 1000xxxx) |
| فاصله ارسال | حداقل فاصله زمانی بین دو پیامک برای یک سهم و سطح (پیش‌فرض: ۶۰ دقیقه) |
| ساعت شروع/پایان ارسال | بازه زمانی مجاز ارسال پیامک |

### تنظیمات ادمین

ادمین می‌تواند از بخش **تنظیمات ادمین** موارد زیر را مدیریت کند:

| تنظیم | توضیح |
|--------|-------|
| فاصله پیش‌فرض ارسال | فاصله زمانی پیش‌فرض بین پیامک‌ها (سیستمی) |
| پیامک تست | ارسال پیامک تست به یک شماره دلخواه با کلید API خود ادمین |
| پیامک تست کاربر | ارسال پیامک تست به یک کاربر خاص با کلید API آن کاربر |

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
| PUT | `/api/user/ippanel-settings` | تنظیمات پیامک و مدیر پیامک |
| GET | `/api/user/sms-stats` | آمار ارسال پیامک |
| GET/POST | `/api/portfolios` | لیست/ساخت پورتفولیو |
| GET/PUT/DELETE | `/api/portfolios/{id}` | مدیریت پورتفولیو |
| GET/POST | `/api/portfolios/{id}/items` | آیتم‌ها |
| PUT/DELETE | `/api/portfolios/{id}/items/{itemId}` | مدیریت سهم |
| GET | `/api/dashboard` | داشبورد |
| PUT | `/api/portfolios/{id}/fee-settings` | کارمزد اختصاصی |
| PUT | `/api/portfolios/{id}/toggle-active` | فعال/غیرفعال |
| POST | `/api/stocks/refresh` | بروزرسانی قیمت |
| GET | `/api/stocks/symbols?q=` | جستجوی نماد |
| GET/POST | `/api/admin/api-keys` | کلیدهای API (ادمین) |
| PUT/DELETE | `/api/admin/api-keys/{id}` | ویرایش/حذف کلید (ادمین) |
| PUT | `/api/admin/schedule` | زمان‌بندی (ادمین) |
| POST | `/api/admin/refresh-symbols` | بروزرسانی دستی نمادها |
| PUT | `/api/admin/sms-settings` | تنظیمات پیامک سیستمی (ادمین) |
| POST | `/api/admin/test-sms` | پیامک تست با کلید ادمین |
| POST | `/api/admin/test-sms-user` | پیامک تست با کلید کاربر |

## ساختار دیتابیس

| جدول | توضیح |
|------|-------|
| `users` | کاربران سیستم و تنظیمات پیامک آن‌ها |
| `portfolios` | پورتفولیوهای سهام کاربران |
| `portfolio_items` | سهام داخل هر پورتفولیو (قیمت خرید، تعداد، سطوح مقاومت/حمایت) |
| `api_keys` | کلیدهای API بورس ادمین |
| `favorites` | نمادهای مورد علاقه کاربران |
| `sms_notifications` | تاریخچه ارسال پیامک‌های اعلان |
| `symbols_cache` | کش قیمت همه نمادهای بازار |
| `system_settings` | تنظیمات سیستمی (زمان‌بندی، کلیدها، فاصله پیش‌فرض پیامک) |

---

## بروزرسانی داده‌ها و کش

داده‌های قیمت سهام از وب‌سرویس **BRS API** (بورس تهران) دریافت و در دیتابیس کش می‌شود تا هم سرعت پاسخ افزایش یابد و هم تعداد درخواست‌های ارسالی به API به حداقل برسد.

### نمای کلی جریان داده

1. درخواست کاربر ابتدا با کش در حافظه (TTL: ۵ دقیقه) و سپس با کش دیتابیس `symbols_cache` (TTL: ۱۰ دقیقه) چک می‌شود.
2. اگر کش تازه باشد، داده مستقیماً از دیتابیس برگردانده می‌شود (`from_cache = true`) و هیچ تماسی با API گرفته نمی‌شود.
3. اگر کش قدیمی باشد، درخواست به BRS API ارسال می‌شود.
4. در صورت موفقیت، داده ذخیره و قیمت‌ها بروزرسانی می‌شود (`from_cache = false`).
5. در صورت خطای API، سیستم به آخرین داده کش‌شده فال‌بک می‌دهد (`from_cache = true`).

### رفرش خودکار

رفرش خودکار توسط کامند `symbols:refresh` انجام می‌شود و فقط در صورتی اجرا می‌شود که:

1. زمان‌بندی فعال باشد
2. فاصله زمانی معتبر باشد
3. در بازه زمانی بازار باشیم
4. از آخرین اجرا به اندازه فاصله تعیین‌شده گذشته باشد

### مدیریت بهینه API

- **کش چندلایه**: حافظه (۵ دقیقه)، دیتابیس (۱۰ دقیقه) و کش سمت کلاینت
- **کلیدهای چندگانه**: پشتیبانی از چند کلید API با failover خودکار
- **عدم آپدیت بی‌مورد**: قیمت‌ها فقط در صورت تغییر واقعی ذخیره می‌شوند
- **خارج از ساعت بازار**: در بازه‌ای که بازار بسته است، درخواستی به API ارسال نمی‌شود

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
- SMS notifications for support/resistance level alerts

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

6. Test it

## Auto Update (Cron Job)

Auto price updates are handled via **Cron Job** in cPanel.

### Setup in cPanel

1. Go to **cPanel** > **Advanced** > **Cron Jobs**
2. Add a new Cron Job:

| Field | Value |
|-------|-------|
| Minute | `*` |
| Hour | `*` |
| Day | `*` |
| Month | `*` |
| Weekday | `*` |

3. In the **Command** field enter:

```bash
cd /home/YOUR_USERNAME/public_html/example.com/backend && php artisan schedule:run >> /dev/null 2>&1
```

> Adjust the path based on your subdomain installation.

### Admin Role

The **first user** to register automatically becomes **Admin**. Admin can:

- **Add, edit, and delete API keys**
- **Configure auto-update schedule** (seconds, minutes, hours)
- **Set execution time range** (start and end time)

## SMS Notifications

Porta's SMS notification system alerts users when stock prices cross support or resistance levels. It uses the **Modir Payamak** (modirpayamak.com / IPPanel) SMS gateway.

### How it works

1. New stock prices are fetched from BRS API
2. The system checks whether the new price crossed above a resistance level or below a support level
3. If a crossing is detected and the cooldown period has passed, an SMS is sent
4. Each send is recorded in the database to prevent duplicate alerts

### SMS messages

Messages are automatically formatted as:

- **Resistance crossing**: `{symbol} reached resistance {level} / Current: {price} / Resistance: {level_value}`
- **Support crossing**: `{symbol} reached support {level} / Current: {price} / Support: {level_value}`

Supported levels: Resistance 1, 2 and Support 1, 2

### User Settings

Each user can manage their SMS settings in the **Settings** page:

| Setting | Description |
|---------|-------------|
| Enable SMS | Turn SMS notifications on/off |
| Phone number | Mobile number to receive SMS |
| Modir Payamak API Key | Web service API key from modirpayamak.com |
| Sender number | SMS sender number (e.g. 1000xxxx) |
| Send interval | Minimum time between SMS for same item & level (default: 60 min) |
| Start/End time | Allowed SMS sending window |

### Admin Settings

| Setting | Description |
|---------|-------------|
| Default send interval | System-wide default cooldown between SMS |
| Test SMS | Send a test SMS using admin's own API key |
| Test SMS for user | Send a test SMS to a specific user using that user's API key |

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
| PUT | `/api/user/ippanel-settings` | Ippanel & SMS settings |
| GET | `/api/user/sms-stats` | SMS statistics |
| GET/POST | `/api/portfolios` | List/Create portfolios |
| GET/PUT/DELETE | `/api/portfolios/{id}` | Manage portfolio |
| GET/POST | `/api/portfolios/{id}/items` | Portfolio items |
| PUT/DELETE | `/api/portfolios/{id}/items/{itemId}` | Manage stock |
| GET | `/api/dashboard` | Dashboard data |
| PUT | `/api/portfolios/{id}/fee-settings` | Portfolio fee settings |
| PUT | `/api/portfolios/{id}/toggle-active` | Toggle active |
| POST | `/api/stocks/refresh` | Refresh prices |
| GET | `/api/stocks/symbols?q=` | Search symbols |
| GET/POST | `/api/admin/api-keys` | API keys (admin) |
| PUT/DELETE | `/api/admin/api-keys/{id}` | Edit/Delete key (admin) |
| PUT | `/api/admin/schedule` | Schedule (admin) |
| POST | `/api/admin/refresh-symbols` | Manual symbol refresh |
| PUT | `/api/admin/sms-settings` | System SMS settings (admin) |
| POST | `/api/admin/test-sms` | Test SMS with admin key |
| POST | `/api/admin/test-sms-user` | Test SMS with user key |

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | System users and their SMS settings |
| `portfolios` | User stock portfolios |
| `portfolio_items` | Stocks within each portfolio (buy price, quantity, support/resistance levels) |
| `api_keys` | Admin's BRS API keys |
| `favorites` | User favorite symbols |
| `sms_notifications` | SMS alert history |
| `symbols_cache` | Cached prices for all market symbols |
| `system_settings` | System settings (schedule, keys, default SMS cooldown) |

---

## Data Update & Caching

Stock price data is fetched from the **BRS API** (Tehran Stock Exchange) and cached in the database for fast responses and minimal API calls.

### High-level data flow

1. A request is checked against in-memory cache (TTL: 5 min), then `symbols_cache` DB table (TTL: 10 min).
2. If the cache is fresh, data is served from the database (`from_cache = true`) with no API call.
3. If the cache is stale, a request is sent to the BRS API.
4. On success, data is saved and prices are updated (`from_cache = false`).
5. If the API fails, the system falls back to cached data (`from_cache = true`).

### Auto refresh

The `symbols:refresh` command runs every minute via Cron and only updates when:

1. Scheduling is enabled
2. The interval is valid
3. We are within market hours
4. Enough time has passed since the last run

### Efficient API usage

- **Multi-layer caching**: in-memory (5 min), database (10 min), client-side cache
- **Multiple keys & failover**: support for multiple API keys with auto-switch
- **No unnecessary writes**: prices only stored when actually changed
- **Market-hours gating**: no API calls when market is closed

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
