<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 100)->unique();
            $table->text('setting_value')->nullable();
            $table->string('description', 255)->nullable();
            $table->timestamps();
        });

        $defaults = [
            ['api_keys', '[]', 'کلیدهای API سیستم (JSON array)'],
            ['schedule_enabled', 'false', 'فعال/غیرفعال بودن زمان‌بندی'],
            ['schedule_seconds', '0', 'ثانیه‌های زمان‌بندی'],
            ['schedule_minutes', '5', 'دقیقه‌های زمان‌بندی'],
            ['schedule_hours', '0', 'ساعت‌های زمان‌بندی'],
            ['schedule_start_time', null, 'زمان شروع بازه اجرا'],
            ['schedule_end_time', null, 'زمان پایان بازه اجرا'],
            ['auto_switch', 'true', 'چرخش خودکار کلید API'],
        ];

        foreach ($defaults as $row) {
            DB::table('system_settings')->insert([
                'setting_key' => $row[0],
                'setting_value' => $row[1],
                'description' => $row[2],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
