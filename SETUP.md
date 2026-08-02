# راه‌اندازی سیستم بروزرسانی خودکار نمادها

## خلاصه تغییرات

### معماری جدید
- **ادمین**: کاربری با دسترسی `is_admin=true` که API Keys و زمان‌بندی رو مدیریت می‌کنه
- **کاربران عادی**: فقط داشبورد و پورتفولیو می‌بینن، دسترسی به تنظیمات API ندارن
- **بروزرسانی خودکار**: از طریق Cron Job سمت سرور انجام می‌شه

### جداول جدید
1. `system_settings` - ذخیره تنظیمات سیستم (API Keys، زمان‌بندی)
2. `symbols_cache` - ذخیره کش نمادهای بازار

---

## مراحل راه‌اندازی

### ۱. اجرای Migration

```bash
cd backend
php artisan migrate
```

### ۲. ساخت کاربر ادمین

روش اول - از طریق Artisan:
```bash
php artisan tinker
```
```php
\App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'password' => Hash::make('your-password'),
    'is_admin' => true,
]);
exit;
```

روش دوم - از طریق ثبت‌نام عادی:
1. ابتدا با ایمیل و رمز دلخواه ثبت‌نام کنید
2. سپس در database، فیلد `is_admin` کاربر مورد نظر رو به `1` تغییر بدید

### ۳. ورود به پنل ادمین

1. وارد سایت شوید
2. از منوی تنظیمات (آیکون چرخ‌دنده) روی **تنظیمات ادمین** کلیک کنید
3. کلید API خود را از [brsapi.ir](https://brsapi.ir) دریافت و وارد کنید

### ۴. تنظیم Cron Job در cPanel

#### روش اول: از طریق رابط گرافیکی cPanel

1. وارد cPanel شوید
2. بخش **Advanced** > **Cron Jobs** رو باز کنید
3. در بخش **Add New Cron Job**:
   - **Common Settings**: `Every 5 minutes (* */5 * * *)`
   - یا دستی وارد کنید: `*/5 * * * *`
4. در فیلد **Command** وارد کنید:
   ```bash
   cd /home/your-username/public_html/backend && php artisan schedule:run >> /dev/null 2>&1
   ```
5. روی **Add New Cron Job** کلیک کنید

#### روش دوم: از طریق فایل .htaccess (اگر دسترسی cron ندارید)

این روش جایگزین مناسبی نیست، اما می‌تونید از سرویس‌های آنلاین مثل [cron-job.org](https://cron-job.org) استفاده کنید:

1. در سایت cron-job.org ثبت‌نام کنید
2. یک job جدید بسازید
3. URL رو تنظیم کنید:
   ```
   https://yourdomain.com/api/admin/refresh-symbols
   ```
4. فرکانس رو روی هر ۵ دقیقه تنظیم کنید

### ۵. تنظیم زمان‌بندی در پنل ادمین

1. وارد **تنظیمات ادمین** شوید
2. بخش **زمان‌بندی بروزرسانی خودکار** رو فعال کنید
3. بازه زمانی اجرا رو تنظیم کنید (مثلاً ۸:۴۵ تا ۱۷:۰۰)
4. روی **ذخیره تنظیمات زمان‌بندی** کلیک کنید

---

## نکات مهم

### API Keys
- فقط ادمین می‌تونه API Key اضافه/حذف/تغییر بده
- تغییرات API Key برای همه کاربران اعمال می‌شه
- اگر چند API Key داشته باشید، سیستم به صورت خودکار بین اونها چرخش می‌کنه

### زمان‌بندی
- زمان‌بندی سمت سرور (Cron Job) اجرا می‌شه
- حتی وقتی هیچ کاربری حضور نداره، داده‌ها بروز می‌مونه
- بازه زمانی اجرا اختیاریه (مثلاً فقط در ساعات بازار)

### کش مرورگر
- کش مرورگر همچنان فعاله برای سرعت بیشتر
- اگر داده‌های دیتابیس بروز باشه، از اونجا خونده می‌شه
- اگر بروز نباشه، هشدار نمایش داده می‌شه

---

## عیب‌یابی

### اگر نمادها بروز نمی‌شن
1. مطمئن شوید Cron Job درست تنظیم شده
2. لاگ‌ها رو بررسی کنید: `backend/storage/logs/laravel.log`
3. دستور زیر رو تست کنید:
   ```bash
   php artisan symbols:refresh
   ```

### اگر خطا در دریافت API دریافت می‌کنید
1. مطمئن شوید API Key درسته
2. وضعیت اشتراک در brsapi.ir رو بررسی کنید
3. محدودیت IP سرور رو بررسی کنید

### اگر صفحه ادمین نمایش داده نمی‌شه
1. مطمئن شوید کاربر شما `is_admin=true` داره
2. از لاگاوت و لاگین مجدد استفاده کنید

---

## ساختار فایل‌های جدید

```
backend/
├── app/
│   ├── Console/Commands/
│   │   └── RefreshSymbols.php          # دستور بروزرسانی نمادها
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── AdminController.php     # کنترلر ادمین
│   │   └── Middleware/
│   │       └── AdminMiddleware.php      # مiddleware ادمین
│   └── Models/
│       └── SystemSetting.php           # مدل تنظیمات سیستم
├── database/migrations/
│   ├── 2026_08_02_200000_add_is_admin_to_users_table.php
│   ├── 2026_08_02_200001_create_system_settings_table.php
│   └── 2026_08_02_200002_create_symbols_cache_table.php
└── routes/
    └── console.php                     # تنظیم Schedule

frontend/src/
├── pages/
│   └── AdminSettings.jsx               # صفحه تنظیمات ادمین
├── App.jsx                             # اضافه شدن مسیر admin-settings
└── components/
    └── Header.jsx                      # اضافه شدن لینک تنظیمات ادمین
```
