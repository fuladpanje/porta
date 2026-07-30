<p align="center">
  <img src="frontend/public/favicon.svg" width="100" alt="پورتا">
</p>

<h1 align="center">پورتا | Porta</h1>

<p align="center" dir="rtl">
  پورتفولیوی هوشمند سهام بورس ایران
</p>

<p align="center">
  <em>Smart Portfolio Manager for Tehran Stock Exchange</em>
</p>

---

<p align="center" dir="rtl">
  یک داشبورد حرفه‌ای RTL برای مدیریت پورتفولیوی سهام بورس ایران.
  محاسبه سود و زیان، سطوح مقاومت و حمایت، نمودار قیمت و بسیاری امکانات دیگر.
</p>

<p align="center">
  <em>A professional RTL dashboard for managing Tehran Stock Exchange portfolios.
  Calculate profit/loss, support & resistance levels, price charts, and much more.</em>
</p>

<p align="center">
  <img src="porta-scr.jpg" alt="Porta Screenshot" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?style=flat-square&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT">
</p>

---

<p align="center" dir="rtl">
  <a href="#ویژگی‌ها">ویژگی‌ها</a> •
  <a href="#دانلود">دانلود</a> •
  <a href="#نصب-روی-هاست-cpanel">نصب</a> •
  <a href="#ساخت-و-توسعه">توسعه</a> •
  <a href="#api">API</a> •
  <a href="#ساختار-پروژه">ساختار</a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#download">Download</a> •
  <a href="#cpanel-installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#api-1">API</a> •
  <a href="#project-structure">Structure</a>
</p>

---

## ویژگی‌ها | Features

<div dir="rtl">

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

</div>

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

---

## دانلود | Download

<div dir="rtl">

### دانلود آخرین نسخه (برای هاست cPanel)

۱. به صفحه [Release‌ها](https://github.com/fuladpanje/porta/releases) بروید
۲. آخرین Release را پیدا کنید و فایل **porta-deploy.zip** را دانلود کنید
۳. فایل ZIP را از حالت فشرده خارج کنید و محتوایش را به `public_html/` سایت خود آپلود کنید

</div>

### Download Latest Release (for cPanel hosting)

1. Go to [Releases page](https://github.com/fuladpanje/porta/releases)
2. Find the latest release and download **porta-deploy.zip**
3. Extract the ZIP and upload contents to your site's `public_html/`

---

## نصب روی هاست cPanel | cPanel Installation

<div dir="rtl">

> بدون نیاز به SSH!

فایل‌های داخل پوشه `deploy/` را به `public_html/` سایت خود آپلود کنید:

```
public_html/
├── backend/
│   ├── public/   ← نقطه ورود Laravel
│   └── ...
└── database.sql  ← ایمپورت در phpMyAdmin
```

سپس مراحل زیر را انجام دهید:

۱. در cPanel یک دیتابیس بسازید (MySQL Databases) و یک کاربر به آن اختصاص دهید
۲. در **phpMyAdmin** دیتابیس را انتخاب کرده و فایل `database.sql` را ایمپورت کنید
۳. مسیر Document Root را تغییر دهید:

   **دامنه اصلی** (مثلاً `example.com`):
   ```
   public_html/example.com/backend/public
   ```

   **ساب‌دامنه** (مثلاً `sub.example.com`):
   ```
   public_html/sub.example.com/backend/public
   ```

   یا ساده‌تر: هر جایی که پوشه `backend/` آپلود شده، `backend/public` را به انتهای مسیر اضافه کنید.
۴. سطح دسترسی `storage/` و `bootstrap/cache/` را `755` قرار دهید
۵. فایل `.env` را ویرایش کنید (پیش‌فرض در `deploy/backend/.env`):

   **اطلاعات دیتابیس:**
   ```env
   DB_DATABASE=YOUR_DB_NAME
   DB_USERNAME=YOUR_DB_USER
   DB_PASSWORD=YOUR_DB_PASSWORD
   ```

   **نام دامنه:**
   ```env
   APP_URL=https://example.com
   SANCTUM_STATEFUL_DOMAINS=example.com
   ```
   بقیه فیلدها را تغییر ندهید.

۶. تست کنید 🎉

</div>

> No SSH required!

Upload the contents of the `deploy/` folder to your site's `public_html/`:

```
public_html/
├── backend/
│   ├── public/   ← Laravel entry point
│   └── ...
└── database.sql  ← Import in phpMyAdmin
```

Then follow these steps:

1. Create a MySQL database in cPanel and assign a user to it
2. In **phpMyAdmin**, select the database and import `database.sql`
3. Change the Document Root path:

   **Main domain** (e.g. `example.com`):
   ```
   public_html/example.com/backend/public
   ```

   **Subdomain** (e.g. `sub.example.com`):
   ```
   public_html/sub.example.com/backend/public
   ```

   Or simply: wherever `backend/` is uploaded, append `backend/public` to the path.
4. Set `storage/` and `bootstrap/cache/` permissions to `755`
5. Edit `.env` file (default at `deploy/backend/.env`):

   **Database credentials:**
   ```env
   DB_DATABASE=YOUR_DB_NAME
   DB_USERNAME=YOUR_DB_USER
   DB_PASSWORD=YOUR_DB_PASSWORD
   ```

   **Domain name:**
   ```env
   APP_URL=https://example.com
   SANCTUM_STATEFUL_DOMAINS=example.com
   ```
   Don't change other fields.

6. Test it 🎉

---

## دستورات مفید | Useful Commands

<div dir="rtl">

```bash
# بیلد فرانت‌اند برای پروداکشن
cd frontend
npm run build

# پاک کردن کش
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# اجرای مایگریشن
cd backend
php artisan migrate
php artisan migrate:fresh --seed   # با داده تستی
```

</div>

```bash
# Build frontend for production
cd frontend
npm run build

# Clear cache
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Run migrations
cd backend
php artisan migrate
php artisan migrate:fresh --seed   # with test data
```

## ساخت فایل deploy و Release | Build Deploy Package

<div dir="rtl">

```bash
# ویندوز (PowerShell)
.\deploy.ps1

# لینوکس/Mac
chmod +x install.sh
./install.sh
```

سپس فایل‌های داخل پوشه `deploy/` را ZIP کنید با نام `porta-deploy.zip` و در صفحه [Releases](https://github.com/fuladpanje/porta/releases) یک Release جدید بسازید. فایل `porta-deploy.zip` را به عنوان Asset ضمیمه کنید.

</div>

```bash
# Windows (PowerShell)
.\deploy.ps1

# Linux/Mac
chmod +x install.sh
./install.sh
```

Then ZIP the contents of the `deploy/` folder as `porta-deploy.zip` and create a new Release on the [Releases page](https://github.com/fuladpanje/porta/releases). Attach `porta-deploy.zip` as an Asset.

---

## API

| Method | Endpoint | توضیح | Description |
|--------|----------|-------|-------------|
| POST | `/api/register` | ثبت‌نام | Register |
| POST | `/api/login` | ورود | Login |
| POST | `/api/logout` | خروج | Logout |
| GET | `/api/user` | اطلاعات کاربر | User info |
| PUT | `/api/user/unit` | تغییر واحد پول | Change currency unit |
| PUT | `/api/user/auto-switch` | تنظیم سوییچ خودکار | Auto switch config |
| PUT | `/api/user/schedule` | تنظیم زمان‌بندی | Schedule config |
| PUT | `/api/user/fee-settings` | تنظیم کارمزد | Fee/commission settings |
| GET/POST | `/api/portfolios` | لیست/ساخت پورتفولیو | List/Create portfolios |
| GET/PUT/DELETE | `/api/portfolios/{id}` | مدیریت پورتفولیو | Manage portfolio |
| GET/POST | `/api/portfolios/{id}/items` | آیتم‌های پورتفولیو | Portfolio items |
| PUT/DELETE | `/api/portfolios/{id}/items/{itemId}` | مدیریت سهم | Manage stock item |
| GET | `/api/dashboard` | داده‌های داشبورد | Dashboard data |
| PUT | `/api/portfolios/{id}/fee-settings` | کارمزد اختصاصی | Portfolio fee settings |
| PUT | `/api/portfolios/{id}/toggle-active` | فعال/غیرفعال | Toggle active |
| POST | `/api/stocks/refresh` | بروزرسانی قیمت‌ها | Refresh prices |
| GET | `/api/stocks/symbols?q=` | جستجوی نماد | Search symbols |
| GET/POST | `/api/api-keys` | مدیریت کلید API | API keys |
| PUT/DELETE | `/api/api-keys/{id}` | ویرایش/حذف کلید | Edit/Delete key |
| POST | `/api/api-keys/{id}/default` | کلید پیش‌فرض | Set default key |

---

## دریافت API Key از BRS | Get API Key from BRS

<div dir="rtl">

برای استفاده از قابلیت بروزرسانی خودکار قیمت‌ها، باید API Key از سایت [brsapi.ir](https://brsapi.ir) دریافت کنید:

۱. به سایت [brsapi.ir](https://brsapi.ir) بروید
۲. ثبت‌نام کنید
۳. به بخش **پنل کاربری** بروید
۴. API Key خود را کپی کنید
۵. در پورتا به مسیر **Settings → API Keys** بروید
۶. کلید را اضافه کنید و به عنوان پیش‌فرض فعال کنید

</div>

To use auto price update, get an API Key from [brsapi.ir](https://brsapi.ir):

1. Go to [brsapi.ir](https://brsapi.ir)
2. Register an account
3. Go to **User Panel**
4. Copy your API Key
5. In Porta, go to **Settings → API Keys**
6. Add the key and set it as default

---

## ساختار پروژه | Project Structure

```
porta/
├── backend/                    # لاراول ۱۱ | Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           # کنترلر احراز هویت | Auth
│   │   │   ├── PortfolioController.php
│   │   │   ├── PortfolioItemController.php
│   │   │   ├── StockController.php
│   │   │   └── ApiKeyController.php
│   │   └── Models/
│   │       ├── User.php
│   │       ├── Portfolio.php
│   │       ├── PortfolioItem.php
│   │       └── ApiKey.php
│   ├── config/
│   ├── database/migrations/    # مایگریشن‌ها | Migrations
│   ├── routes/api.php          # مسیرهای API | API routes
│   └── public/                 # نقطه ورود + فرانت‌اند | Entry point + frontend
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── ThemeProvider.jsx
│   │   │   └── SymbolSearch.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── AllSymbols.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx
│   │   │   └── usePortfolio.jsx
│   │   ├── contexts/
│   │   │   └── UnitContext.jsx
│   │   └── lib/
│   │       ├── api.js
│   │       ├── calculations.js
│   │       └── symbolCache.js
│   ├── public/favicon.svg
│   └── dist/                   # خروجی بیلد | Build output
│
├── deploy.bat                  # اسکریپت استقرار ویندوز | Windows deploy
├── deploy.ps1                  # اسکریپت PowerShell | PowerShell deploy
├── database.sql                # فایل SQL دیتابیس | Database SQL
├── install.sh                  # اسکریپت استقرار لینوکس | Linux deploy
├── porta-scr.jpg               # اسکرین‌شات | Screenshot
├── porta-deploy.zip            # بسته آماده استقرار | Deploy package
├── setup.bat                   # راه‌اندازی محلی | Local setup
└── .env.example                # نمونه متغیرهای محیطی | Env example
```

---

## تکنولوژی‌ها | Technologies

| لایه | تکنولوژی | Version |
|------|----------|---------|
| بک‌اند / Backend | Laravel | 11 |
| احراز هویت / Auth | Laravel Sanctum | 4 |
| فرانت‌اند / Frontend | React | 18 |
| بیلد / Build | Vite | 6 |
| استایل / CSS | Tailwind CSS | 3 |
| نمودار / Charts | Chart.js | 4 |
| آیکون / Icons | Lucide React | 0.460 |
| فونت / Font | وزیرمتن / Vazirmatn | 5 |

---

## لایسنس | License

<div dir="rtl">

این پروژه تحت مجوز MIT منتشر شده است.

</div>

This project is licensed under the MIT License.

---

<p align="center" dir="rtl">
  ساخته شده با ❤️ برای سرمایه‌گذاران بازار بورس ایران
</p>

<p align="center">
  <em>Made with ❤️ for Iran stock market investors</em>
</p>
