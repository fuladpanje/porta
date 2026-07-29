<p align="center">
  <img src="frontend/public/favicon.svg" width="100" alt="Porta Logo">
</p>

<h1 align="center">پورتا | Porta</h1>

<p align="center">
  پورتفولیوی هوشمند سهام بورس ایران
</p>

<p align="center">
  <a href="#ویژگی‌ها">ویژگی‌ها</a> •
  <a href="#نصب-سریع">نصب سریع</a> •
  <a href="#نصب-روی-hosting">هاست cPanel</a> •
  <a href="#ساخت-و-توسعه">توسعه</a> •
  <a href="#ساختار-پروژه">ساختار</a>
</p>

---

<p align="center">
  یک داشبورد حرفه‌ای RTL برای مدیریت پورتفولیوی سهام بورس ایران.
  محاسبه سود و زیان، سطوح مقاومت و حمایت، نمودار قیمت و بسیاری امکانات دیگر.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?style=flat-square&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

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

1. به صفحه اصلی [ریپوزیتوری](https://github.com/fuladpanje/porta) بروید
2. روی دکمه **Code** کلیک کنید
3. گزینه **Download ZIP** را انتخاب کنید
4. فایل دانلود شده را از حالت فشرده خارج کنید

## دریافت API Key از BRS

برای استفاده از قابلیت بروزرسانی خودکار قیمت‌ها، باید API Key از سایت [brsapi.ir](https://brsapi.ir) دریافت کنید:

1. به سایت [brsapi.ir](https://brsapi.ir) بروید
2. ثبت‌نام کنید
3. به بخش **پنل کاربری** بروید
4. API Key خود را کپی کنید
5. در پنل مدیریت پورتا به مسیر **Settings → API Keys** بروید
6. کلید را اضافه کنید و فعال کنید

## نصب سریع

### پیش‌نیازها

- PHP 8.2 یا بالاتر
- Composer
- Node.js 18+ و npm
- MySQL

### راه‌اندازی محلی (Development)

```bash
# ۱. کلون کردن پروژه
git clone https://github.com/fuladpanje/porta.git
cd porta

# ۲. نصب وابستگی‌های بک‌اند
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000 &

# ۳. نصب وابستگی‌های فرانت‌اند (پنجره جدید)
cd frontend
npm install
npm run dev
```

اکنون مرورگر را به آدرس `http://localhost:5173` باز کنید.

### متغیرهای محیطی

فایل `.env` در پوشه `backend`:

```env
APP_NAME=Porta
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=porta
DB_USERNAME=root
DB_PASSWORD=
```

## نصب روی هاست cPanel

> بدون نیاز به SSH! فقط آماده‌سازی را روی کامپیوتر خود انجام دهید و فایل‌ها را از طریق cPanel آپلود کنید.

### مرحله ۱: آماده‌سازی فایل‌ها (روی کامپیوتر شخصی)

ابتدا اسکریپت deploy را روی کامپیوتر خود اجرا کنید تا فایل‌های آماده استقرار ساخته شوند:

```bash
# ویندوز (PowerShell)
.\deploy.ps1

# لینوکس / Mac
chmod +x install.sh
./install.sh
```

اسکریپت از شما دامنه می‌پرسد و خودکار فایل‌های فرانت‌اند و بک‌اند را build و در پوشه `deploy/` آماده می‌کند.

**پیش‌نیاز:** Node.js، npm، PHP و Composer باید روی کامپیوتر شما نصب باشند.

### مرحله ۲: آپلود فایل‌ها

1. وارد **cPanel** شوید
2. به **File Manager** بروید
3. محتویات پوشه `deploy/` را در `public_html/` آپلود کنید
4. ساختار پوشه‌ها باید اینطور باشد:

```
public_html/
├── installer.php          ← فایل نصب وب
└── backend/
    ├── index.php
    ├── .htaccess
    ├── app/
    ├── config/
    ├── database/
    ├── public/             ← فایل‌های فرانت‌اند
    ├── routes/
    ├── storage/
    └── vendor/
```

### مرحله ۳: تنظیم Document Root

در cPanel به بخش **Domains** بروید و Document Root را روی:

```
public_html/backend/public
```

تنظیم کنید.

### مرحله ۴: ساخت دیتابیس

1. در cPanel به **MySQL Databases** بروید
2. یک دیتابیس جدید بسازید
3. یک کاربر جدید بسازید و به دیتابیس اضافه کنید
4. دسترسی **ALL PRIVILEGES** بدهید

### مرحله ۵: اجرای نصب‌کننده

مرورگر را به آدرس زیر باز کنید:

```
https://yourdomain.com/installer.php
```

فرم را پر کنید و دکمه **Install** را بزنید. تمام!

### مرحله ۶: حذف نصب‌کننده

**مهم:** بعد از نصب موفق، فایل `installer.php` را از روی سرور حذف کنید.

## ساخت و توسعه

### دستورات مفید

```bash
# بیلد فرانت‌اند برای پروداکشن
cd frontend
npm run build

# حذف کش
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# مایگریشن
cd backend
php artisan migrate
php artisan migrate:fresh --seed   # با داده تستی
```

### ساخت فایل deploy

```bash
# ویندوز
.\deploy.ps1

# لینوکس/Mac
chmod +x install.sh
./install.sh
```

## ساختار پروژه

```
porta/
├── backend/                    # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           # AuthController
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
│   ├── database/migrations/    # 13 migration
│   ├── routes/api.php          # مسیرهای API
│   └── public/                 # نقطه ورود Laravel
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
│   └── dist/                   # خروجی بیلد
│
├── deploy.bat                  # اسکریپت deploy ویندوز
├── deploy.ps1                  # اسکریپت deploy PowerShell
├── install.sh                  # اسکریپت deploy لینوکس
├── installer.php               # نصب‌کننده وب (بدون SSH)
└── setup.bat                   # راه‌اندازی محلی ویندوز
```

## API

| مسیر | متد | توضیح |
|------|-----|-------|
| `/api/register` | POST | ثبت‌نام |
| `/api/login` | POST | ورود |
| `/api/logout` | POST | خروج (نیاز به auth) |
| `/api/user` | GET | اطلاعات کاربر |
| `/api/portfolios` | GET/POST | لیست/ساخت پورتفولیو |
| `/api/portfolios/{id}` | GET/PUT/DELETE | مدیریت پورتفولیو |
| `/api/dashboard` | GET | داده داشبورد |
| `/api/portfolios/{id}/items` | GET/POST | آیتم‌های پورتفولیو |
| `/api/stocks/refresh` | POST | بروزرسانی قیمت‌ها |
| `/api/stocks/symbols?q=` | GET | جستجوی نماد |
| `/api/api-keys` | GET/POST | مدیریت کلیدهای API |

## تکنولوژی‌ها

| لایه | تکنولوژی | نسخه |
|------|----------|------|
| Backend | Laravel | 11 |
| Auth | Laravel Sanctum | 4 |
| Frontend | React | 18 |
| Build | Vite | 6 |
| CSS | Tailwind CSS | 3 |
| Charts | Chart.js | 4 |
| Icon | Lucide React | 0.460 |
| Font | Vazirmatn | 5 |

## لایسنس

MIT License

---

<p align="center">
  ساخته شده با ❤️ برای سرمایه‌گذاران بازار بورس ایران
</p>
