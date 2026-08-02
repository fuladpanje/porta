<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value',
        'description',
    ];

    /**
     * Get a setting value by key
     */
    public static function get(string $key, $default = null)
    {
        $setting = static::where('setting_key', $key)->first();
        return $setting ? $setting->setting_value : $default;
    }

    /**
     * Set a setting value
     */
    public static function set(string $key, $value, ?string $description = null): void
    {
        static::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $value,
                'description' => $description,
            ]
        );
    }

    /**
     * Get API keys as array
     */
    public static function getApiKeys(): array
    {
        $json = static::get('api_keys', '[]');
        $keys = json_decode($json, true);
        return is_array($keys) ? $keys : [];
    }

    /**
     * Set API keys
     */
    public static function setApiKeys(array $keys): void
    {
        static::set('api_keys', json_encode($keys));
    }

    /**
     * Get schedule settings as array
     */
    public static function getSchedule(): array
    {
        return [
            'enabled' => static::get('schedule_enabled', 'false') === 'true',
            'seconds' => (int) static::get('schedule_seconds', '0'),
            'minutes' => (int) static::get('schedule_minutes', '5'),
            'hours' => (int) static::get('schedule_hours', '0'),
            'start_time' => static::get('schedule_start_time'),
            'end_time' => static::get('schedule_end_time'),
        ];
    }

    /**
     * Get auto switch setting
     */
    public static function getAutoSwitch(): bool
    {
        return static::get('auto_switch', 'true') === 'true';
    }
}
