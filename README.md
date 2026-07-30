<p align="center">
  <img src="frontend/public/favicon.svg" width="100" alt="پورتا">
</p>

<h1 align="center">پورتا | Porta</h1>

<p align="center">
  پورتفولیوی هوشمند سهام بورس ایران
</p>

<p align="center">
  <a href="#ویژگی‌ها">ویژگی‌ها</a> •
  <a href="#دانلود">دانلود</a> •
  <a href="#نصب-روی-هاست-cpanel">نصب</a> •
  <a href="#ساخت-و-توسعه">توسعه</a> •
  <a href="#api">API</a> •
  <a href="#ساختار-پروژه">ساختار</a>
</p>

---

<p align="center">
  یک داشبورد حرفه‌ای RTL برای مدیریت پورتفولیوی سهام بورس ایران.
  محاسبه سود و زیان، سطوح مقاومت و حمایت، نمودار قیمت و بسیاری امکانات دیگر.
</p>

<p align="center">
  <img src="porta-scr.jpg" alt="نمای پورتا" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-11-FF2D20?style=flat-square&logo=laravel" alt="Laravel">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/PHP-8.2-777BB4?style=flat-square&logo=php" alt="PHP">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="مجوز">
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

### دانلود آخرین نسخه (برای هاست cPanel)

۱. به صفحه [Release‌ها](https://github.com/fuladpanje/porta/releases) بروید
۲. آخرین Release را پیدا کنید و فایل **porta-deploy.zip** را دانلود کنید
۳. فایل ZIP را از حالت فشرده خارج کنید و محتوایش را به `public_html/` سایت خود آپلود کنید

## نصب روی هاست cPanel

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
   DB_DATABASE=نام_دیتابیس
   DB_USERNAME=نام_کاربر
   DB_PASSWORD=رمز_عبور
   ```

   **نام دامنه:**
   ```env
   APP_URL=https://example.com
   SANCTUM_STATEFUL_DOMAINS=example.com
   ```
   بقیه فیلدها را تغییر ندهید.

۶. تست کنید 🎉

---

## دستورات مفید

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

## ساخت فایل deploy و Release

```bash
# ویندوز (PowerShell)
.\deploy.ps1

# لینوکس/Mac
chmod +x install.sh
./install.sh
```

سپس فایل‌های داخل پوشه `deploy/` را ZIP کنید با نام `porta-deploy.zip` و در صفحه [Releases](https://github.com/fuladpanje/porta/releases) یک Release جدید بسازید. فایل `porta-deploy.zip` را به عنوان Asset ضمیمه کنید.

## API

| مسیر | متد | توضیح |
|------|-----|-------|
| `/api/register` | POST | ثبت‌نام کاربر جدید |
| `/api/login` | POST | ورود به حساب کاربری |
| `/api/logout` | POST | خروج (نیاز به احراز هویت) |
| `/api/user` | GET | دریافت اطلاعات کاربر |
| `/api/user/unit` | PUT | تغییر واحد پول (ریال/تومان) |
| `/api/user/auto-switch` | PUT | تنظیم سوییچ خودکار حالت بازار |
| `/api/user/schedule` | PUT | تنظیم زمان‌بندی بروزرسانی خودکار |
| `/api/user/fee-settings` | PUT | تنظیمات کارمزد خرید/فروش |
| `/api/portfolios` | GET/POST | لیست/ساخت پورتفولیو |
| `/api/portfolios/{id}` | GET/PUT/DELETE | مدیریت پورتفولیو |
| `/api/portfolios/{id}/items` | GET/POST | آیتم‌های یک پورتفولیو |
| `/api/portfolios/{id}/items/{itemId}` | PUT/DELETE | مدیریت یک سهم |
| `/api/dashboard` | GET | داده‌های داشبورد |
| `/api/portfolios/{id}/fee-settings` | PUT | تنظیم کارمزد اختصاصی پورتفولیو |
| `/api/portfolios/{id}/toggle-active` | PUT | فعال/غیرفعال کردن پورتفولیو |
| `/api/stocks/refresh` | POST | بروزرسانی قیمت‌ها از بورس |
| `/api/stocks/symbols?q=` | GET | جستجوی نماد بورسی |
| `/api/api-keys` | GET/POST | مدیریت کلیدهای API |
| `/api/api-keys/{id}` | PUT/DELETE | ویرایش/حذف کلید API |
| `/api/api-keys/{id}/default` | POST | تنظیم کلید پیش‌فرض |

## دریافت API Key از BRS

برای استفاده از قابلیت بروزرسانی خودکار قیمت‌ها، باید API Key از سایت [brsapi.ir](https://brsapi.ir) دریافت کنید:

۱. به سایت [brsapi.ir](https://brsapi.ir) بروید
۲. ثبت‌نام کنید
۳. به بخش **پنل کاربری** بروید
۴. API Key خود را کپی کنید
۵. در پورتا به مسیر **Settings → API Keys** بروید
۶. کلید را اضافه کنید و به عنوان پیش‌فرض فعال کنید

## ساختار پروژه

```
porta/
├── backend/                    # لاراول ۱۱
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   ├── Auth/           # کنترلر احراز هویت
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
│   ├── database/migrations/    # فایل‌های مایگریشن
│   ├── routes/api.php          # مسیرهای API
│   └── public/                 # نقطه ورود + فرانت‌اند بیلد شده
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
│   └── dist/                   # خروجی بیلد فرانت‌اند
│
├── deploy.bat                  # اسکریپت استقرار برای ویندوز
├── deploy.ps1                  # اسکریپت استقرار PowerShell
├── database.sql                # فایل SQL دیتابیس
├── install.sh                  # اسکریپت استقرار لینوکس
├── porta-scr.jpg               # اسکرین‌شات
├── porta-deploy.zip            # بسته آماده استقرار
├── setup.bat                   # راه‌اندازی محیط توسعه
└── .env.example                # نمونه فایل متغیرهای محیطی
```

## تکنولوژی‌ها

| لایه | تکنولوژی | نسخه |
|------|----------|------|
| بک‌اند | Laravel | ۱۱ |
| احراز هویت | Laravel Sanctum | ۴ |
| فرانت‌اند | React | ۱۸ |
| بیلد | Vite | ۶ |
| CSS | Tailwind CSS | ۳ |
| نمودار | Chart.js | ۴ |
| آیکون | Lucide React | ۰.۴۶۰ |
| فونت | وزیرمتن | ۵ |

## لایسنس

این پروژه تحت مجوز MIT منتشر شده است.

---

<p align="center">
  ساخته شده با ❤️ برای سرمایه‌گذاران بازار بورس ایران
</p>
