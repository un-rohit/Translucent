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

    // On Vercel, copy bundled database to /tmp if not yet created
    if (isVercel && !fs.existsSync(dbPath)) {
        const candidateBundledPaths = [
            path.join(__dirname, 'data', 'translucent.db'),
            path.join(process.cwd(), 'server', 'data', 'translucent.db'),
            path.join(process.cwd(), 'data', 'translucent.db')
        ];
        for (const bp of candidateBundledPaths) {
            if (fs.existsSync(bp)) {
                try {
                    fs.copyFileSync(bp, dbPath);
                    console.log(`[Database] Seeded database from ${bp} to ${dbPath}`);
                    break;
                } catch (e) {
                    console.warn('[Database] Seeding error:', e.message);
                }
            }
        }
    }

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

    // Ensure active device, device name, and session columns exist for single-device enforcement
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN active_device_id TEXT;`); } catch (_) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN active_device_name TEXT;`); } catch (_) {}
    try { sqliteDb.exec(`ALTER TABLE users ADD COLUMN active_session_token TEXT;`); } catch (_) {}

    // Ensure Rohit Kumar is always pre-approved with Lifetime Pro
    try {
        sqliteDb.prepare(`
            INSERT INTO users (id, email, name, status, plan, created_at, last_active_at)
            VALUES (1, 'un.rohitkumar@gmail.com', 'Rohit Kumar', 'active', 'lifetime', datetime('now'), datetime('now'))
            ON CONFLICT(email) DO UPDATE SET status = 'active', plan = 'lifetime'
        `).run();
        sqliteDb.prepare(`
            INSERT INTO users (email, name, status, plan, created_at, last_active_at)
            VALUES ('rohitkumarrar@gmail.com', 'Rohit Kumar', 'active', 'lifetime', datetime('now'), datetime('now'))
            ON CONFLICT(email) DO UPDATE SET status = 'active', plan = 'lifetime'
        `).run();
    } catch (_) {}
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

async function deleteSetting(key) {
    if (isSupabaseEnabled) {
        await supabase.from('settings').delete().eq('key', key);
    } else {
        sqliteDb.prepare('DELETE FROM settings WHERE key = ?').run(key);
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

// ─────────────────────────────────────────────────────────────────
// Single Active Device Session Enforcement
// ─────────────────────────────────────────────────────────────────
async function setActiveDeviceSession(userId, deviceId, sessionId, deviceName = '') {
    const now = new Date().toISOString();
    const payload = JSON.stringify({ 
        deviceId: deviceId || '', 
        sessionId: sessionId || '', 
        deviceName: deviceName || '',
        updatedAt: now 
    });
    await setSetting(`active_session_${userId}`, payload);

    if (isSupabaseEnabled) {
        try {
            await supabase.from('users').update({ 
                active_device_id: deviceId || null, 
                active_device_name: deviceName || null,
                active_session_token: sessionId || null 
            }).eq('id', userId);
        } catch (e) {
            // Column may not exist on remote Supabase; universal settings table handles this seamlessly
        }
    } else {
        try {
            sqliteDb.prepare('UPDATE users SET active_device_id = ?, active_device_name = ?, active_session_token = ? WHERE id = ?')
                .run(deviceId || null, deviceName || null, sessionId || null, userId);
        } catch (e) {}
    }
}

async function getActiveDeviceSession(userId) {
    // 1. Check universal settings storage
    const val = await getSetting(`active_session_${userId}`, null);
    if (val) {
        try {
            return JSON.parse(val);
        } catch (_) {}
    }

    // 2. Fallback to users table
    const user = await getUserById(userId);
    if (user && (user.active_device_id || user.active_session_token || user.active_device_name)) {
        return {
            deviceId: user.active_device_id || '',
            sessionId: user.active_session_token || '',
            deviceName: user.active_device_name || ''
        };
    }
    return null;
}

module.exports = {
    isSupabaseEnabled,
    getSetting,
    setSetting,
    deleteSetting,
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
    setActiveDeviceSession,
    getActiveDeviceSession,
    sqliteDb,
    supabase
};
