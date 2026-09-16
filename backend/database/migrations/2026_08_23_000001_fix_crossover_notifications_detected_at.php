<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // حذف ON UPDATE از detected_at که در database.sql به اشتباه اضافه شده بود
        // این باعث می‌شد هر آپدیت ردیف زمان detected_at را به now تغییر دهد و فیلتر فرانت خراب شود
        try {
            DB::statement("ALTER TABLE `crossover_notifications` MODIFY `detected_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP");
        } catch (\Throwable $e) {
            // fallback via Schema if raw fails (e.g. SQLite)
            try {
                Schema::table('crossover_notifications', function (Blueprint $table) {
                    $table->timestamp('detected_at')->default(DB::raw('CURRENT_TIMESTAMP'))->change();
                });
            } catch (\Throwable $e2) {
                // silent - table may not exist on fresh install
            }
        }
    }

    public function down(): void
    {
        // no rollback needed
    }
};
