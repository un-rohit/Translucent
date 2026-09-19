const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'translucent_super_secure_jwt_secret_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ─────────────────────────────────────────────────────────────────
// Database Setup (SQLite using native node:sqlite)
// ─────────────────────────────────────────────────────────────────
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const dataDir = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'translucent.db');
const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_url TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'active', 'suspended'
        plan TEXT DEFAULT 'pro',       -- 'pro', 'enterprise', 'lifetime'
        expires_at TEXT,               -- ISO 8601 string or NULL for lifetime
        created_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        notes TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`);

// Insert default settings if missing
const initSetting = (key, defaultValue) => {
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, defaultValue);
    }
};
const DEFAULT_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '845827182936-duqebq9k2l34ir3qqma7gp9jl8l2cg7l.apps.googleusercontent.com';
initSetting('payment_url', 'https://buy.stripe.com/example_or_contact_admin');
initSetting('support_contact', 'Telegram: @translucent_admin | Email: support@translucent.ai');
initSetting('admin_password', ADMIN_PASSWORD);
initSetting('google_client_id', DEFAULT_GOOGLE_CLIENT_ID);

// Update google_client_id if empty
const currentGoogleId = db.prepare("SELECT value FROM settings WHERE key = 'google_client_id'").get()?.value;
if (!currentGoogleId || currentGoogleId.trim() === '') {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'google_client_id'").run(DEFAULT_GOOGLE_CLIENT_ID);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─────────────────────────────────────────────────────────────────
// Authentication Helpers
// ─────────────────────────────────────────────────────────────────
function generateUserToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            status: user.status
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function verifyUserToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token expired or invalid' });
    }
}

function verifyAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin authorization required' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
        }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Admin session expired' });
    }
}

function checkUserSubscriptionActive(user) {
    if (user.status !== 'active') return false;
    if (!user.expires_at) return true; // Lifetime
    const expiry = new Date(user.expires_at);
    return expiry > new Date();
}

// ─────────────────────────────────────────────────────────────────
// Public API Endpoints
// ─────────────────────────────────────────────────────────────────

// Public Config (for desktop app and login page)
app.get('/api/public/config', (req, res) => {
    const paymentUrl = db.prepare("SELECT value FROM settings WHERE key = 'payment_url'").get()?.value || '';
    const supportContact = db.prepare("SELECT value FROM settings WHERE key = 'support_contact'").get()?.value || '';
    const googleClientId = db.prepare("SELECT value FROM settings WHERE key = 'google_client_id'").get()?.value || '';

    res.json({
        paymentUrl,
        supportContact,
        googleClientId
    });
});

// Google Authentication Endpoint
// Handles both official Google ID tokens & direct credential payloads
app.post('/api/auth/google', async (req, res) => {
    try {
        const { email, name, avatarUrl, googleId } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const now = new Date().toISOString();

        // Check if user already exists
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

        if (user) {
            // Update last active, name, avatar if provided
            db.prepare(`
                UPDATE users 
                SET last_active_at = ?,
                    name = COALESCE(?, name),
                    avatar_url = COALESCE(?, avatar_url),
                    google_id = COALESCE(?, google_id)
                WHERE id = ?
            `).run(now, name || null, avatarUrl || null, googleId || null, user.id);

            user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        } else {
            // Register new user with status 'pending'
            const result = db.prepare(`
                INSERT INTO users (google_id, email, name, avatar_url, status, plan, created_at, last_active_at)
                VALUES (?, ?, ?, ?, 'pending', 'pro', ?, ?)
            `).run(googleId || null, cleanEmail, name || cleanEmail.split('@')[0], avatarUrl || null, now, now);

            user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        }

        const isSubscribed = checkUserSubscriptionActive(user);
        const token = generateUserToken(user);

        res.json({
            token,
            isSubscribed,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                status: user.status,
                plan: user.plan,
                expiresAt: user.expires_at,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

// Subscription Status Check (called by Desktop App)
app.get('/api/subscription/status', verifyUserToken, (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Auto-check expiration
        let status = user.status;
        if (status === 'active' && user.expires_at) {
            const expiry = new Date(user.expires_at);
            if (expiry <= new Date()) {
                status = 'expired';
                db.prepare("UPDATE users SET status = 'expired' WHERE id = ?").run(user.id);
            }
        }

        const isSubscribed = status === 'active';

        res.json({
            isSubscribed,
            status,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                status,
                plan: user.plan,
                expiresAt: user.expires_at,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to verify subscription status' });
    }
});

// ─────────────────────────────────────────────────────────────────
// Admin API Endpoints
// ─────────────────────────────────────────────────────────────────

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const currentAdminPassword = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get()?.value || ADMIN_PASSWORD;

    if (!password || password !== currentAdminPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ isAdmin: true, role: 'superadmin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Admin authenticated successfully' });
});

// Admin Stats
app.get('/api/admin/stats', verifyAdminToken, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count;
    const pendingUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'pending'").get().count;
    const expiredUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'expired'").get().count;

    res.json({
        totalUsers,
        activeUsers,
        pendingUsers,
        expiredUsers
    });
});

// Admin Users List
app.get('/api/admin/users', verifyAdminToken, (req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json({ users });
});

// Admin Approve User Subscription
app.post('/api/admin/users/:id/approve', verifyAdminToken, (req, res) => {
    const userId = req.params.id;
    const { durationDays = 30, plan = 'pro', notes = '' } = req.body;

    let expiresAt = null;
    if (durationDays > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + parseInt(durationDays, 10));
        expiresAt = exp.toISOString();
    }

    db.prepare(`
        UPDATE users 
        SET status = 'active',
            plan = ?,
            expires_at = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
    `).run(plan, expiresAt, notes || null, userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ message: 'User approved and subscription activated', user: updatedUser });
});

// Admin Revoke User Subscription
app.post('/api/admin/users/:id/revoke', verifyAdminToken, (req, res) => {
    const userId = req.params.id;
    const { reason = 'Revoked by admin' } = req.body;

    db.prepare(`
        UPDATE users 
        SET status = 'pending',
            notes = ?
        WHERE id = ?
    `).run(reason, userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ message: 'User subscription revoked', user: updatedUser });
});

// Admin Delete User
app.delete('/api/admin/users/:id', verifyAdminToken, (req, res) => {
    const userId = req.params.id;
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'User deleted successfully' });
});

// Admin Update Settings
app.post('/api/admin/settings', verifyAdminToken, (req, res) => {
    const { paymentUrl, supportContact, newPassword, googleClientId } = req.body;

    if (paymentUrl !== undefined) {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'payment_url'").run(paymentUrl);
    }
    if (supportContact !== undefined) {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'support_contact'").run(supportContact);
    }
    if (googleClientId !== undefined) {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'google_client_id'").run(googleClientId.trim());
    }
    if (newPassword && newPassword.trim().length >= 6) {
        db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_password'").run(newPassword.trim());
    }

    res.json({ message: 'Settings updated successfully' });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Malformed JSON in request payload' });
    }
    console.error('Unhandled Server Error:', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server if run directly
if (!isVercel || require.main === module) {
    app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 Translucent Auth & License Server Running`);
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin.html`);
        console.log(`🔐 Default Admin Password: ${ADMIN_PASSWORD}`);
        console.log(`=================================================`);
    });
}

module.exports = app;
