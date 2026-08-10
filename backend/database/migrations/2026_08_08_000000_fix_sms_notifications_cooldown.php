<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'sms_notifications';

        $indexes = DB::select('SHOW INDEX FROM sms_notifications');
        $indexNames = array_unique(array_map(fn($i) => $i->Key_name, $indexes));

        if (in_array('sms_notifications_portfolio_item_id_level_type_sent_at_index', $indexNames)) {
            DB::statement("DROP INDEX sms_notifications_portfolio_item_id_level_type_sent_at_index ON {$tableName}");
        }

        DB::statement("ALTER TABLE {$tableName} MODIFY portfolio_item_id BIGINT UNSIGNED NULL");
        DB::statement("ALTER TABLE {$tableName} MODIFY sent_at DATETIME NOT NULL");

        DB::statement("CREATE INDEX sms_cooldown_index ON {$tableName} (user_id, symbol, level_type, sent_at)");
    }

    public function down(): void
    {
        $tableName = 'sms_notifications';

        DB::statement("DROP INDEX sms_cooldown_index ON {$tableName}");
        DB::statement("ALTER TABLE {$tableName} MODIFY portfolio_item_id BIGINT UNSIGNED NOT NULL");
        DB::statement("ALTER TABLE {$tableName} MODIFY sent_at TIMESTAMP NOT NULL");
        DB::statement("ALTER TABLE {$tableName} ADD INDEX portfolio_item_id_level_type_sent_at_index (portfolio_item_id, level_type, sent_at)");
    }
};
