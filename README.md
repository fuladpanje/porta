<p align="center">
  <img src="frontend/public/favicon.svg" width="100" alt="Porta Logo">
</p>

<h1 align="center">پورتا | Porta</h1>

<p align="center">
  پورتفولیوی هوشمند سهام بورس ایران
</p>

<p align="center">
  <a href="#ویژگی‌ها">ویژگی‌ها</a> •
  <a href="#دانلود">دانلود</a> •
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
  <img src="porta-scr.jpg" alt="Porta Screenshot" width="100%">
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

### آماده استقرار (برای هاست cPanel)

1. به صفحه [Release ها](https://github.com/fuladpanje/porta/releases) بروید
2. آخرین Release را پیدا کنید
3. فایل **porta-deploy.zip** را دانلود کنید
4. فایل ZIP را از حالت فشرده خارج کنید

اگر می‌خواهید روی سرور خودتان بیلد کنید، کد را کلون کنید و اسکریپت‌های deploy را اجرا کنید.

### کلون کردن برای توسعه

1. به صفحه اصلی [ریپوزیتوری](https://github.com/fuladpanje/porta) بروید
2. روی دکمه **Code** کلیک کنید
3. گزینه **Download ZIP** را انتخاب کنید
4. فایل دانلود شده را از حالت فشرده خارج کنید

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

### مرحله ۱: بیلد محلی

روی کامپیوترت این دستورات رو اجرا کن:

```powershell
.\deploy.ps1
```

اسکریپت خودش فرانت‌اند رو بیلد می‌کنه، dependencyهای بک‌اند رو نصب می‌کنه، فایل `.env` رو میسازه و APP_KEY رو تولید می‌کنه.

### مرحله ۲: تنظیم `.env`

فایل `deploy/backend/.env` رو باز کن و اطلاعات دیتابیست رو پر کن:

```
DB_DATABASE=نام_دیتابیس
DB_USERNAME=نام_کاربر_dیتابیس
DB_PASSWORD=رمز_دیتابیس
```
(از **MySQL Databases** توی cPanel پیدا میشه)

### مرحله ۳: آپلود فایل‌ها

۱. وارد **cPanel** شو
۲. به **File Manager** برو
۳. به پوشه دامنه برو (مثلاً `public_html/`)
۴. محتویات پوشه `deploy/` رو اینجا آپلود کن (نه خود پوشه deploy، بلکه فایل‌های داخلش)

ساختار نهایی:

```
public_html/
├── backend/
│   ├── public/
│   │   ├── index.php
│   │   ├── .htaccess
│   │   └── assets/
│   ├── vendor/
│   ├── app/
│   └── ...
├── database.sql
```

### مرحله ۴: ایمپورت دیتابیس

۱. cPanel → **phpMyAdmin**
۲. روی دیتابیست کلیک کن
۳. تب **SQL**
۴. محتوای `database.sql` رو کپی و Paste کن
۵. **Go** رو بزن

### مرحله ۵: تغییر Document Root

cPanel → **Domains** → دامنه‌ات → **Manage**

Document Root رو عوض کن به:

```
public_html/backend/public
```

### مرحله ۶: تنظیم پرمیشن‌ها

توی File Manager:
- `storage/` → راست کلیک → **Permissions** → `755`
- `bootstrap/cache/` → راست کلیک → **Permissions** → `755`

### مرحله ۷: تست

```
https://porto.fuladpanjeh.ir/
```

باید سایت نمایش داده شود. 🎉

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

### ساخت فایل deploy و Release

```bash
# ویندوز
.\deploy.ps1

# لینوکس/Mac
chmod +x install.sh
./install.sh
```

سپس فایل‌های داخل پوشه `deploy/` را به صورت ZIP فشرده کنید و در صفحه [Releases](https://github.com/fuladpanje/porta/releases) یک Release جدید بسازید. فایل ZIP را به عنوان Asset ضمیم کنید.

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
│   └── public/                 # نقطه ورود Laravel + فرانت‌اند
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
├── database.sql                # فایل SQL برای ایمپورت دیتابیس
├── install.sh                  # اسکریپت deploy لینوکس
├── porta-scr.jpg               # اسکرین‌شات سایت
├── porta-deploy.zip            # بسته آماده استقرار
├── setup.bat                   # راه‌اندازی محلی ویندوز
└── .env.example                # متغیرهای محیطی نمونه
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

## دریافت API Key از BRS

برای استفاده از قابلیت بروزرسانی خودکار قیمت‌ها، باید API Key از سایت [brsapi.ir](https://brsapi.ir) دریافت کنید:

1. به سایت [brsapi.ir](https://brsapi.ir) بروید
2. ثبت‌نام کنید
3. به بخش **پنل کاربری** بروید
4. API Key خود را کپی کنید
5. در پنل مدیریت پورتا به مسیر **Settings → API Keys** بروید
6. کلید را اضافه کنید و فعال کنید

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