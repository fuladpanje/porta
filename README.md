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

۱. به صفحه [Release‌ها](https://github.com/fuladpanje/porta/releases) بروید
۲. آخرین Release را پیدا کنید و فایل **porta-deploy.zip** را دانلود کنید
۳. فایل ZIP را از حالت فشرده خارج کنید و محتوایش را به `public_html/` سایت خود آپلود کنید

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

۱. در cPanel یک دیتابیس بسازید و یک کاربر به آن اختصاص دهید
۲. در phpMyAdmin، دیتابیس را انتخاب کرده و `database.sql` را ایمپورت کنید
۳. Document Root را به `backend/public` تغییر دهید
۴. سطح دسترسی `storage/` و `bootstrap/cache/` را `755` قرار دهید
۵. فایل `.env` را ویرایش کنید:

```env
DB_DATABASE=نام_دیتابیس
DB_USERNAME=نام_کاربر
DB_PASSWORD=رمز_عبور
APP_URL=https://example.com
SANCTUM_STATEFUL_DOMAINS=example.com
```

۶. تست کنید 🎉

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
