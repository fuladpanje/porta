<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // portfolio_items: قیمت قبلی برای تشخیص دقیق کراس روی هاست اشتراکی
        // قبلاً فقط در حافظه (snapshot) نگه داشته می‌شد و با ریکوئست همزمان گم می‌شد
        if (Schema::hasTable('portfolio_items') && !Schema::hasColumn('portfolio_items', 'prev_last_price')) {
            Schema::table('portfolio_items', function (Blueprint $table) {
                $table->decimal('prev_last_price', 12, 2)->nullable()->after('last_price');
            });
        }

        // symbols_cache: قیمت قبلی کش کلی بازار
        if (Schema::hasTable('symbols_cache') && !Schema::hasColumn('symbols_cache', 'prev_last_price')) {
            Schema::table('symbols_cache', function (Blueprint $table) {
                $table->decimal('prev_last_price', 12, 2)->nullable()->after('last_price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('portfolio_items') && Schema::hasColumn('portfolio_items', 'prev_last_price')) {
            Schema::table('portfolio_items', function (Blueprint $table) {
                $table->dropColumn('prev_last_price');
            });
        }
        if (Schema::hasTable('symbols_cache') && Schema::hasColumn('symbols_cache', 'prev_last_price')) {
            Schema::table('symbols_cache', function (Blueprint $table) {
                $table->dropColumn('prev_last_price');
            });
        }
    }
};
