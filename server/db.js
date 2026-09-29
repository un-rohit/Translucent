const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const isSupabaseEnabled = Boolean(
    SUPABASE_URL && 
    SUPABASE_KEY && 
    SUPABASE_KEY.trim() !== '' && 
    !SUPABASE_KEY.startsWith('http') && 
    SUPABASE_KEY.includes('.')
);

let supabase = null;
let sqliteDb = null;

if (isSupabaseEnabled) {
    console.log(`[Database] 🚀 Connecting to Supabase Cloud (${SUPABASE_URL})...`);
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    });
} else {
    console.log('[Database] 💾 Using Local SQLite storage (Provide SUPABASE_SERVICE_ROLE_KEY in .env to use Supabase)');
    const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
    const dataDir = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'translucent.db');
    sqliteDb = new DatabaseSync(dbPath);

    // Initialize Tables in SQLite
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            avatar_url TEXT,
            status TEXT DEFAULT 'pending',
            plan TEXT DEFAULT 'pro',
            expires_at TEXT,
            created_at TEXT NOT NULL,
            last_active_at TEXT NOT NULL,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);
}

// ─────────────────────────────────────────────────────────────────
// Data Access Methods (Universal across Supabase and SQLite)
// ─────────────────────────────────────────────────────────────────

async function getSetting(key, defaultValue = '') {
    if (isSupabaseEnabled) {
        const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
        if (error || !data) return defaultValue;
        return data.value;
    } else {
        const row = sqliteDb.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : defaultValue;
    }
}

async function setSetting(key, value) {
    if (isSupabaseEnabled) {
        await supabase.from('settings').upsert({ key, value });
    } else {
        sqliteDb.prepare(`
            INSERT INTO settings (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(key, value);
    }
}

async function initSetting(key, defaultValue) {
    const existing = await getSetting(key, null);
    if (existing === null) {
        await setSetting(key, defaultValue);
    }
}

async function getUserByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseEnabled) {
        const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
        if (error) {
            console.error('Supabase getUserByEmail error:', error);
            return null;
        }
        return data;
    } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) || null;
    }
}

async function getUserById(id) {
    if (isSupabaseEnabled) {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (error) {
            console.error('Supabase getUserById error:', error);
            return null;
        }
        return data;
    } else {
        return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    }
}

async function upsertUser({ email, name, avatarUrl, googleId }) {
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    if (isSupabaseEnabled) {
        const existing = await getUserByEmail(cleanEmail);
        if (existing) {
            const updates = {
                last_active_at: now
            };
            if (name) updates.name = name;
            if (avatarUrl) updates.avatar_url = avatarUrl;
            if (googleId) updates.google_id = googleId;

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', existing.id)
                .select('*')
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('users')
                .insert({
                    google_id: googleId || null,
                    email: cleanEmail,
                    name: name || cleanEmail.split('@')[0],
                    avatar_url: avatarUrl || null,
                    status: 'pending',
                    plan: 'pro',
                    created_at: now,
                    last_active_at: now
                })
                .select('*')
                .single();

            if (error) throw error;
            return data;
        }
    } else {
        let user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
        if (user) {
            sqliteDb.prepare(`
                UPDATE users 
                SET last_active_at = ?,
                    name = COALESCE(?, name),
                    avatar_url = COALESCE(?, avatar_url),
                    google_id = COALESCE(?, google_id)
                WHERE id = ?
            `).run(now, name || null, avatarUrl || null, googleId || null, user.id);
            return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        } else {
            const result = sqliteDb.prepare(`
                INSERT INTO users (google_id, email, name, avatar_url, status, plan, created_at, last_active_at)
                VALUES (?, ?, ?, ?, 'pending', 'pro', ?, ?)
            `).run(googleId || null, cleanEmail, name || cleanEmail.split('@')[0], avatarUrl || null, now, now);
            return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        }
    }
}

async function updateUserExpiredStatus(id) {
    if (isSupabaseEnabled) {
        await supabase.from('users').update({ status: 'expired' }).eq('id', id);
    } else {
        sqliteDb.prepare("UPDATE users SET status = 'expired' WHERE id = ?").run(id);
    }
}

async function getAllUsers() {
    if (isSupabaseEnabled) {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase getAllUsers error:', error);
            return [];
        }
        return data || [];
    } else {
        return sqliteDb.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }
}

async function getStats() {
    if (isSupabaseEnabled) {
        const [totalRes, activeRes, pendingRes, expiredRes] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('users').select('id', { count: 'exact', head: true }).in('status', ['expired', 'suspended'])
        ]);

        return {
            totalUsers: totalRes.count || 0,
            activeUsers: activeRes.count || 0,
            pendingUsers: pendingRes.count || 0,
            expiredUsers: expiredRes.count || 0
        };
    } else {
        return {
            totalUsers: sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get().count,
            activeUsers: sqliteDb.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count,
            pendingUsers: sqliteDb.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").get().count,
            expiredUsers: sqliteDb.prepare("SELECT COUNT(*) as count FROM users WHERE status IN ('expired', 'suspended')").get().count
        };
    }
}

async function approveUser(id, { durationDays = 30, plan = 'pro', notes = '' }) {
    let expiresAt = null;
    if (durationDays > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + parseInt(durationDays, 10));
        expiresAt = exp.toISOString();
    }

    if (isSupabaseEnabled) {
        const { data, error } = await supabase
            .from('users')
            .update({
                status: 'active',
                plan,
                expires_at: expiresAt,
                notes: notes || null
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } else {
        sqliteDb.prepare(`
            UPDATE users 
            SET status = 'active',
                plan = ?,
                expires_at = ?,
                notes = COALESCE(?, notes)
            WHERE id = ?
        `).run(plan, expiresAt, notes || null, id);
        return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
}

async function setUserPendingNote(id, notes) {
    if (isSupabaseEnabled) {
        await supabase.from('users').update({ notes }).eq('id', id);
    } else {
        sqliteDb.prepare('UPDATE users SET notes = ? WHERE id = ?').run(notes, id);
    }
}

async function revokeUser(id, reason = 'Revoked by admin') {
    if (isSupabaseEnabled) {
        const { data, error } = await supabase
            .from('users')
            .update({
                status: 'pending',
                notes: reason
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } else {
        sqliteDb.prepare(`
            UPDATE users 
            SET status = 'pending',
                notes = ?
            WHERE id = ?
        `).run(reason, id);
        return sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    }
}

async function deleteUser(id) {
    if (isSupabaseEnabled) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
    } else {
        sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
}

module.exports = {
    isSupabaseEnabled,
    getSetting,
    setSetting,
    initSetting,
    getUserByEmail,
    getUserById,
    upsertUser,
    updateUserExpiredStatus,
    getAllUsers,
    getStats,
    approveUser,
    setUserPendingNote,
    revokeUser,
    deleteUser,
    sqliteDb,
    supabase
};
