require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

async function migrate() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
        process.exit(1);
    }

    const dbPath = path.join(__dirname, 'data', 'translucent.db');
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Error: Local database file not found at:', dbPath);
        process.exit(1);
    }

    console.log('📦 Connecting to local SQLite database...');
    const sqlite = new DatabaseSync(dbPath);
    const users = sqlite.prepare('SELECT * FROM users').all();
    const settings = sqlite.prepare('SELECT * FROM settings').all();

    console.log(`Found ${users.length} users and ${settings.length} settings in local database.`);

    console.log(`🚀 Connecting to Supabase (${SUPABASE_URL})...`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    });

    // 1. Migrate Settings
    console.log('⚙️ Migrating settings...');
    for (const s of settings) {
        const { error } = await supabase.from('settings').upsert({
            key: s.key,
            value: s.value
        });
        if (error) {
            console.warn(`  ⚠️ Failed to migrate setting "${s.key}":`, error.message);
        } else {
            console.log(`  ✓ Setting "${s.key}" migrated`);
        }
    }

    // 2. Migrate Users
    console.log('👥 Migrating users...');
    for (const u of users) {
        const { data, error } = await supabase.from('users').upsert({
            google_id: u.google_id || null,
            email: u.email,
            name: u.name,
            avatar_url: u.avatar_url,
            status: u.status || 'pending',
            plan: u.plan || 'pro',
            expires_at: u.expires_at || null,
            created_at: u.created_at || new Date().toISOString(),
            last_active_at: u.last_active_at || new Date().toISOString(),
            notes: u.notes || null
        }, { onConflict: 'email' });

        if (error) {
            console.warn(`  ⚠️ Failed to migrate user "${u.email}":`, error.message);
        } else {
            console.log(`  ✓ User "${u.name || ''}" (${u.email}) migrated [Status: ${u.status}]`);
        }
    }

    console.log('\n🎉 Migration complete! All data is now in Supabase.');
}

migrate().catch(err => {
    console.error('Fatal Migration Error:', err);
});
