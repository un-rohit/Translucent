const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
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

// Clean route for Privacy Policy
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

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

// Helper: Upsert User & Generate Session Token
async function upsertAndAuthenticateUser(email, name, avatarUrl, googleId) {
    const user = await db.upsertUser({ email, name, avatarUrl, googleId });
    const isSubscribed = checkUserSubscriptionActive(user);
    const token = generateUserToken(user);

    return {
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
    };
}

// Google OAuth 2.0 Authorization Code Exchange Endpoint
// Exchanges authorization code for real Google profile (name, email, avatar)
app.post('/api/auth/google/code', async (req, res) => {
    try {
        const { code, redirectUri } = req.body;
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
            profile.sub || null
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
        let { email, name, avatarUrl, googleId, credential } = req.body;

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

        const authResult = await upsertAndAuthenticateUser(email, name, avatarUrl, googleId);
        res.json(authResult);
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
});

// Subscription Status Check (called by Desktop App)
app.get('/api/subscription/status', verifyUserToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
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
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin.html`);
        console.log(`🔐 Default Admin Password: ${ADMIN_PASSWORD}`);
        console.log(`=================================================`);
    });
}

module.exports = app;
