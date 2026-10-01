const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

// Translucent Pro Backend Server (Active Database: SQLite / Ready for Supabase)
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'translucent_super_secure_jwt_secret_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;

// ─────────────────────────────────────────────────────────────────
// Database Setup (Universal: Supabase Cloud or Local SQLite)
// ─────────────────────────────────────────────────────────────────
const db = require('./db');
const { initTelegramBot } = require('./bot');

const DEFAULT_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '845827182936-duqebq9k2l34ir3qqma7gp9jl8l2cg7l.apps.googleusercontent.com';

// Ensure default settings exist & Start Telegram Bot
(async () => {
    try {
        await db.initSetting('payment_url', '/pay.html');
        const currPayUrl = await db.getSetting('payment_url');
        if (!currPayUrl || currPayUrl.includes('example') || currPayUrl.includes('stripe.com')) {
            await db.setSetting('payment_url', '/pay.html');
        }
        await db.initSetting('support_contact', 'Telegram: @translucent_admin | Email: support@translucent.ai');
        await db.initSetting('admin_password', ADMIN_PASSWORD);
        await db.initSetting('google_client_id', DEFAULT_GOOGLE_CLIENT_ID);
        await db.initSetting('download_url', '/downloads/Translucent.exe');
        await db.initSetting('telegram_bot_username', process.env.TELEGRAM_BOT_USERNAME || '');
        await db.initSetting('telegram_upi_id', process.env.TELEGRAM_UPI_ID || 'rohit.1604@superyes');

        // Launch Telegram Bot
        initTelegramBot();
    } catch (e) {
        console.warn('Initial setup check:', e.message);
    }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Clean routes for Next.js Migrated Pages
app.get(['/privacy', '/privacy.html'], (req, res) => {
    const p = path.join(__dirname, 'public', 'privacy.html');
    if (fs.existsSync(p)) return res.sendFile(p);
    res.redirect('/');
});

app.get(['/pay', '/pay.html'], (req, res) => {
    const p = path.join(__dirname, 'public', 'pay.html');
    if (fs.existsSync(p)) return res.sendFile(p);
    res.redirect('/');
});

app.get(['/login', '/login.html'], (req, res) => {
    const p = path.join(__dirname, 'public', 'login.html');
    if (fs.existsSync(p)) return res.sendFile(p);
    res.redirect('/');
});

// Route /admin and /admin.html to the Next.js Admin portal
app.get(['/admin', '/admin.html'], (req, res) => {
    if (process.env.ADMIN_URL) {
        return res.redirect(process.env.ADMIN_URL);
    }
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    if (fs.existsSync(adminPath)) {
        return res.sendFile(adminPath);
    }
    res.redirect('http://localhost:3001');
});

// ─────────────────────────────────────────────────────────────────
// Authentication Helpers
// ─────────────────────────────────────────────────────────────────
function generateUserToken(user, sessionId, deviceId) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            status: user.status,
            sessionId: sessionId || '',
            deviceId: deviceId || ''
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
app.get('/api/public/config', async (req, res) => {
    try {
        const paymentUrl = await db.getSetting('payment_url', '');
        const supportContact = await db.getSetting('support_contact', '');
        const googleClientId = await db.getSetting('google_client_id', DEFAULT_GOOGLE_CLIENT_ID);
        const downloadUrl = await db.getSetting('download_url', '/downloads/Translucent.exe');
        const telegramBotUsername = (await db.getSetting('telegram_bot_username', '')) || process.env.TELEGRAM_BOT_USERNAME || '';
        const telegramUpiId = (await db.getSetting('telegram_upi_id', '')) || process.env.TELEGRAM_UPI_ID || 'rohit.1604@superyes';

        res.json({
            paymentUrl,
            supportContact,
            googleClientId,
            downloadUrl,
            telegramBotUsername,
            telegramUpiId
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to load public config' });
    }
});

// Direct Application Download Endpoint
app.get('/api/download', async (req, res) => {
    const downloadUrl = await db.getSetting('download_url', '/downloads/Translucent.exe');
    res.redirect(downloadUrl);
});

// Payment UTR Submission Endpoint
app.post('/api/payment/submit-utr', async (req, res) => {
    try {
        const { utr, email, userId } = req.body;
        if (!utr || !utr.trim()) {
            return res.status(400).json({ error: 'UTR / Transaction ID is required' });
        }
        console.log(`[Payment] 💳 UTR submitted: "${utr.trim()}" for user (id: ${userId}, email: ${email})`);

        let user = null;
        if (userId) {
            user = await db.getUserById(userId);
        }
        if (!user && email) {
            user = await db.getUserByEmail(email);
        }

        if (user) {
            await db.approveUser(user.id, {
                durationDays: user.status === 'active' ? undefined : 0,
                plan: user.plan || 'lifetime',
                notes: `Submitted UTR: ${utr.trim()} on ${new Date().toISOString()}`
            }).catch(() => {});
        }

        res.json({ success: true, message: 'Transaction ID recorded successfully' });
    } catch (e) {
        console.error('Submit UTR error:', e);
        res.status(500).json({ error: 'Failed to record transaction details' });
    }
});

// ─────────────────────────────────────────────────────────────────
// Cloud Auth Session Store (for VMware, Remote Desktop, & Cross-Device Sign-In)
// ─────────────────────────────────────────────────────────────────
const pendingAuthSessions = new Map(); // sessionId -> { token, user, createdAt }

setInterval(() => {
    const now = Date.now();
    for (const [sid, sess] of pendingAuthSessions.entries()) {
        if (now - sess.createdAt > 10 * 60 * 1000) {
            pendingAuthSessions.delete(sid);
        }
    }
}, 60 * 1000);

// Session check endpoint (polled by Desktop App, e.g. on VMware / isolated network)
app.get('/api/auth/session-check', async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(204).end();
        }

        // 1. In-memory check
        let sess = pendingAuthSessions.get(sessionId);

        // 2. Persistent check (Supabase / SQLite) for cross-lambda / cold-start reliability
        if (!sess) {
            const raw = await db.getSetting(`auth_session_${sessionId}`, null);
            if (raw) {
                try {
                    sess = JSON.parse(raw);
                } catch (_) {}
            }
        }

        if (!sess) {
            return res.status(204).end(); // No content yet
        }

        res.json(sess);
    } catch (err) {
        console.error('Session check error:', err);
        res.status(500).json({ error: 'Session check failed' });
    }
});

// Session complete endpoint (called by Next.js login page upon successful auth)
app.post('/api/auth/session-complete', async (req, res) => {
    try {
        const { sessionId, token, user } = req.body;
        if (sessionId && token) {
            const sessData = {
                token,
                user,
                createdAt: Date.now()
            };
            pendingAuthSessions.set(sessionId, sessData);
            try {
                await db.setSetting(`auth_session_${sessionId}`, JSON.stringify(sessData));
            } catch (e) {
                console.warn('Could not persist auth session in session-complete:', e.message);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Callback route fallback (if user's browser ever visits /callback on this domain)
app.get(['/callback', '/callback/'], (req, res) => {
    const { token, email, name, status, deviceName } = req.query;
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful — Translucent</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #070709; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { max-width: 440px; width: 100%; background: #121217; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .icon { width: 54px; height: 54px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 16px; }
        h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; }
        p { color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; font-size: 13px; font-weight: 600; border-radius: 12px; border: none; cursor: pointer; text-decoration: none; margin-top: 10px; }
        .btn-copy { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #e4e4e7; }
        .btn-copy:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .user-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; margin-bottom: 20px; text-align: left; font-size: 12px; }
        .user-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .user-row:last-child { margin-bottom: 0; }
        .label { color: #71717a; }
        .val { color: #f4f4f5; font-weight: 600; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✓</div>
        <h1>Successfully Signed In!</h1>
        <p>Your Translucent license is connected. You can return to Translucent Desktop.</p>
        <div class="user-box">
            ${email ? `<div class="user-row"><span class="label">Email:</span><span class="val">${email}</span></div>` : ''}
            ${name ? `<div class="user-row"><span class="label">Name:</span><span class="val">${name}</span></div>` : ''}
            ${deviceName ? `<div class="user-row"><span class="label">Device:</span><span class="val">${deviceName}</span></div>` : ''}
        </div>
        ${token ? `
        <button id="copyBtn" class="btn btn-copy" onclick="copyToken()">📋 Copy Login Token (For VMware / Manual Login)</button>
        <script>
            function copyToken() {
                navigator.clipboard.writeText('${token}');
                var b = document.getElementById('copyBtn');
                b.innerText = '✓ Token Copied to Clipboard!';
                b.style.borderColor = '#10b981';
                b.style.color = '#34d399';
            }
            try { navigator.clipboard.writeText('${token}'); } catch(e){}
        </script>
        ` : ''}
    </div>
</body>
</html>`);
});

// Helper: Upsert User & Generate Session Token (with Single-Device enforcement)
async function upsertAndAuthenticateUser(email, name, avatarUrl, googleId, deviceId, deviceName, authSessionId) {
    let user = await db.upsertUser({ email, name, avatarUrl, googleId });

    // Ensure Rohit Kumar is automatically active with lifetime pro
    if (user.email && user.email.toLowerCase() === 'un.rohitkumar@gmail.com') {
        if (user.status !== 'active' || user.plan !== 'lifetime') {
            user = await db.approveUser(user.id, { durationDays: 0, plan: 'lifetime', notes: 'Owner / Lifetime Pro' });
        }
    }

    const isSubscribed = checkUserSubscriptionActive(user);

    // Generate new unique active session ID (invalidates any other active device)
    const sessionId = crypto.randomUUID();
    await db.setActiveDeviceSession(user.id, deviceId, sessionId, deviceName);

    const token = generateUserToken(user, sessionId, deviceId);

    const authResult = {
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
            createdAt: user.created_at,
            deviceId: deviceId || '',
            deviceName: deviceName || 'Windows PC'
        }
    };

    if (authSessionId) {
        const sessData = {
            ...authResult,
            createdAt: Date.now()
        };
        pendingAuthSessions.set(authSessionId, sessData);
        try {
            await db.setSetting(`auth_session_${authSessionId}`, JSON.stringify(sessData));
        } catch (e) {
            console.warn('Could not persist auth session in upsert:', e.message);
        }
    }

    return authResult;
}

// Google OAuth 2.0 Authorization Code Exchange Endpoint
// Exchanges authorization code for real Google profile (name, email, avatar)
app.post('/api/auth/google/code', async (req, res) => {
    try {
        const { code, redirectUri, deviceId, deviceName, sessionId } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }

        const clientId = (await db.getSetting('google_client_id')) || DEFAULT_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientSecret) {
            console.error('Missing GOOGLE_CLIENT_SECRET in environment');
            return res.status(500).json({ error: 'Server misconfiguration: GOOGLE_CLIENT_SECRET missing' });
        }

        const tokenParams = new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams.toString()
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            console.error('Google token exchange error:', tokenData);
            return res.status(400).json({ error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code' });
        }

        // Fetch userinfo from Google
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        const profile = await userinfoRes.json();
        if (!profile.email) {
            return res.status(400).json({ error: 'Failed to retrieve user profile from Google' });
        }

        const authResult = await upsertAndAuthenticateUser(
            profile.email,
            profile.name || profile.email.split('@')[0],
            profile.picture || null,
            profile.sub || null,
            deviceId,
            deviceName,
            sessionId
        );

        res.json(authResult);
    } catch (error) {
        console.error('Google OAuth Code Error:', error);
        res.status(500).json({ error: 'Internal server error during Google OAuth authentication' });
    }
});

// Google Authentication Endpoint
// Handles both official Google ID tokens & direct credential payloads
app.post('/api/auth/google', async (req, res) => {
    try {
        let { email, name, avatarUrl, googleId, credential, deviceId, deviceName, sessionId } = req.body;

        // If Google Identity Services ID token credential is provided, verify with Google
        if (credential) {
            try {
                const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
                if (verifyRes.ok) {
                    const tokenInfo = await verifyRes.json();
                    email = tokenInfo.email;
                    name = tokenInfo.name || name;
                    avatarUrl = tokenInfo.picture || avatarUrl;
                    googleId = tokenInfo.sub || googleId;
                }
            } catch (err) {
                console.warn('Google tokeninfo verification failed, continuing with body params:', err);
            }
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const authResult = await upsertAndAuthenticateUser(email, name, avatarUrl, googleId, deviceId, deviceName, sessionId);
        res.json(authResult);
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

// Subscription Status Check (called by Desktop App)
app.get('/api/subscription/status', verifyUserToken, async (req, res) => {
    try {
        let user = await db.getUserById(req.user.userId);
        if (!user && req.user.email) {
            user = await db.getUserByEmail(req.user.email);
        }
        if (!user && req.user.email) {
            user = await db.upsertUser({
                email: req.user.email,
                name: req.user.email.split('@')[0],
                avatarUrl: null,
                googleId: null
            });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Automatic lifetime activation for owner
        if (user.email && user.email.toLowerCase() === 'un.rohitkumar@gmail.com') {
            if (user.status !== 'active' || user.plan !== 'lifetime') {
                user = await db.approveUser(user.id, { durationDays: 0, plan: 'lifetime', notes: 'Owner / Lifetime Pro' });
            }
        }

        const clientDeviceId = (req.headers['x-device-id'] || req.query.deviceId || req.user.deviceId || '').trim();
        const clientDeviceName = (req.headers['x-device-name'] || req.query.deviceName || '').trim();

        // Single Active Device Enforcement:
        let activeSession = await db.getActiveDeviceSession(user.id);
        if (activeSession) {
            const tokenSessionId = (req.user.sessionId || '').trim();
            const activeSessionId = (activeSession.sessionId || '').trim();
            const activeDevId = (activeSession.deviceId || '').trim();
            const currDevId = clientDeviceId;

            // Multi-device conflict ONLY triggers if:
            // 1. Both active session and incoming request have a registered device ID, AND they differ (distinct physical devices)
            // 2. AND the incoming token does NOT match the newer active session (meaning this is the older superseded device)
            const isDifferentDevice = Boolean(activeDevId && currDevId && activeDevId.toLowerCase() !== currDevId.toLowerCase());
            const isSupersededSession = Boolean(activeSessionId && tokenSessionId && tokenSessionId !== activeSessionId);

            if (isDifferentDevice && isSupersededSession) {
                const otherDevName = activeSession.deviceName ? ` ("${activeSession.deviceName}")` : '';
                return res.status(409).json({
                    error: 'device_conflict',
                    message: `Your Translucent Pro account was signed in on another device${otherDevName}. Only 1 active device is permitted at a time.`
                });
            }
        }

        // Update active device name & ID in database/session
        const effDevId = clientDeviceId || (activeSession ? activeSession.deviceId : '');
        const effSessId = req.user.sessionId || (activeSession ? activeSession.sessionId : '');
        const effDevName = clientDeviceName || (activeSession ? activeSession.deviceName : 'Windows PC');
        if (effDevId || effDevName || effSessId) {
            await db.setActiveDeviceSession(user.id, effDevId, effSessId, effDevName);
            activeSession = await db.getActiveDeviceSession(user.id);
        }

        // Auto-check expiration
        let status = user.status;
        if (status === 'active' && user.expires_at) {
            const expiry = new Date(user.expires_at);
            if (expiry <= new Date()) {
                status = 'expired';
                await db.updateUserExpiredStatus(user.id);
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
                createdAt: user.created_at,
                deviceId: (activeSession && activeSession.deviceId) || user.active_device_id || clientDeviceId || '',
                deviceName: (activeSession && activeSession.deviceName) || user.active_device_name || clientDeviceName || 'Windows PC'
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
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const currentAdminPassword = (await db.getSetting('admin_password')) || ADMIN_PASSWORD;

    if (!password || password !== currentAdminPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ isAdmin: true, role: 'superadmin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: 'Admin authenticated successfully' });
});

// Admin Stats
app.get('/api/admin/stats', verifyAdminToken, async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: 'Failed to retrieve stats' });
    }
});

// Admin Users List
app.get('/api/admin/users', verifyAdminToken, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ users });
    } catch (e) {
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Admin Approve User Subscription
app.post('/api/admin/users/:id/approve', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { durationDays = 30, plan = 'pro', notes = '' } = req.body;
        const updatedUser = await db.approveUser(userId, { durationDays, plan, notes });
        res.json({ message: 'User approved and subscription activated', user: updatedUser });
    } catch (e) {
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// Admin Revoke User Subscription
app.post('/api/admin/users/:id/revoke', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason = 'Revoked by admin' } = req.body;
        const updatedUser = await db.revokeUser(userId, reason);
        res.json({ message: 'User subscription revoked', user: updatedUser });
    } catch (e) {
        res.status(500).json({ error: 'Failed to revoke user' });
    }
});

// Admin Delete User
app.delete('/api/admin/users/:id', verifyAdminToken, async (req, res) => {
    try {
        const userId = req.params.id;
        await db.deleteUser(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin Update Settings
app.post('/api/admin/settings', verifyAdminToken, async (req, res) => {
    try {
        const { paymentUrl, supportContact, newPassword, googleClientId, downloadUrl, telegramBotUsername, telegramUpiId } = req.body;

        if (paymentUrl !== undefined) await db.setSetting('payment_url', paymentUrl);
        if (supportContact !== undefined) await db.setSetting('support_contact', supportContact);
        if (googleClientId !== undefined) await db.setSetting('google_client_id', googleClientId.trim());
        if (downloadUrl !== undefined) await db.setSetting('download_url', downloadUrl.trim());
        if (telegramBotUsername !== undefined) await db.setSetting('telegram_bot_username', telegramBotUsername.trim().replace(/^@/, ''));
        if (telegramUpiId !== undefined) await db.setSetting('telegram_upi_id', telegramUpiId.trim());
        if (newPassword && newPassword.trim().length >= 6) await db.setSetting('admin_password', newPassword.trim());

        res.json({ message: 'Settings updated successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
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
        console.log(`📡 Server API URL: http://localhost:${PORT}`);
        console.log(`🔑 Admin Console (Next.js): http://localhost:3001`);
        console.log(`🔐 Default Admin Password: ${ADMIN_PASSWORD}`);
        console.log(`=================================================`);
    });
}

module.exports = app;
