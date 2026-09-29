const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const fs = require('fs');
const db = require('./db');

let bot = null;
const pendingOrders = new Map(); // chatId -> { userId, plan, durationDays, planName, amount }

function initTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token.trim() === '' || token.includes('your_bot_token')) {
        console.log('[Telegram Bot] ℹ️ TELEGRAM_BOT_TOKEN not configured in .env. Bot waiting for token.');
        return null;
    }

    try {
        bot = new Telegraf(token.trim());

        const upiId = process.env.TELEGRAM_UPI_ID || 'rohit.1604@superyes';
        const cryptoAddress = process.env.TELEGRAM_CRYPTO_ADDRESS || '';
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

        // Command: /start (Supports deep linking /start sub_123 or /start sub_email)
        bot.start(async (ctx) => {
            const payload = ctx.startPayload || '';
            const chatId = ctx.chat.id;

            let user = null;
            if (payload.startsWith('sub_')) {
                const target = payload.replace('sub_', '').trim();
                const userId = parseInt(target, 10);
                if (!isNaN(userId)) {
                    user = await db.getUserById(userId);
                }
                if (!user) {
                    let decodedEmail = target.replace(/_at_/g, '@').replace(/_/g, '.');
                    user = await db.getUserByEmail(decodedEmail);
                    if (!user) {
                        try {
                            const allUsers = await db.getAllUsers();
                            user = allUsers.find(u => 
                                (u.email && u.email.toLowerCase() === decodedEmail.toLowerCase()) || 
                                (u.email && u.email.toLowerCase().replace(/[@.]/g, '_') === target.toLowerCase())
                            );
                        } catch (e) {}
                    }
                }
            }

            // Welcome greeting
            let greeting = `⚡ *Welcome to Translucent Pro Licensing* ⚡\n\n`;
            if (user) {
                greeting += `👤 *Account:* ${user.name || 'Pro User'}\n`;
                greeting += `📧 *Email:* \`${user.email}\`\n`;
                greeting += `📊 *Status:* ${user.status.toUpperCase()}\n\n`;
                greeting += `Unlock full access to Translucent Stealth AI Companion & Overlay with Lifetime Pro:`;
            } else {
                greeting += `Unlock full access to Translucent Pro Stealth AI Companion & Overlay.\n\n`;
                greeting += `Select your subscription plan below:`;
            }

            const targetUserId = user ? user.id : 'unknown';

            return ctx.replyWithMarkdown(greeting, Markup.inlineKeyboard([
                [Markup.button.callback('👑 Lifetime Pro Access — ₹99 Only', `plan_0_lifetime_${targetUserId}`)],
                [Markup.button.callback('💎 1 Month Pro — ₹49', `plan_30_pro_${targetUserId}`)],
                [Markup.button.callback('❓ Need Help / Contact Support', 'contact_support')]
            ]));
        });

        // Command: /getid or /admin to get admin chat ID easily
        bot.command(['getid', 'admin', 'chatid', 'id'], (ctx) => {
            return ctx.replyWithMarkdown(
                `📋 *Your Telegram Chat ID:* \`${ctx.chat.id}\`\n\n` +
                `Copy this number and paste it into your \`server/.env\` file:\n` +
                `\`TELEGRAM_ADMIN_CHAT_ID=${ctx.chat.id}\`\n\n` +
                `Once added, you will receive all payment screenshots and 1-click approval buttons directly here!`
            );
        });

        // Plan Selection Callback
        bot.action(/plan_(\d+)_(pro|lifetime)_(.+)/, async (ctx) => {
            await ctx.answerCbQuery();
            const durationDays = parseInt(ctx.match[1], 10);
            const planType = ctx.match[2];
            const userId = ctx.match[3];

            let planName = 'Lifetime Pro Access';
            let amount = '₹99';
            if (durationDays === 30) {
                planName = '1 Month Pro';
                amount = '₹49';
            }

            // Save pending order in memory
            pendingOrders.set(ctx.chat.id, {
                userId: userId !== 'unknown' ? userId : null,
                plan: planType,
                durationDays,
                planName,
                amount
            });

            const paymentMsg = 
                `👑 *${planName} — ${amount}*\n\n` +
                `💳 *Payment Details:*\n` +
                `🔹 *UPI ID:* \`${upiId}\`\n` +
                `💰 *Amount Due:* *${amount}*\n` +
                (cryptoAddress ? `🔹 *Crypto:* \`${cryptoAddress}\`\n` : '') +
                `━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📸 *Next Step:*\n` +
                `1. Scan the QR code or pay to \`${upiId}\` via GPay, PhonePe, Paytm, or BHIM.\n` +
                `2. *Send your transaction screenshot* or *Transaction ID / UTR number* right here in this chat!\n\n` +
                `⚡ Our admin will verify and activate your license within minutes!`;

            const qrPath = path.join(__dirname, 'public', 'qr_payment.png');
            if (fs.existsSync(qrPath)) {
                try {
                    return await ctx.replyWithPhoto({ source: qrPath }, {
                        caption: paymentMsg,
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🔄 Choose Another Plan', 'reselect_plan')],
                            [Markup.button.callback('💬 Contact Admin', 'contact_support')]
                        ])
                    });
                } catch (imgErr) {
                    console.warn('[Telegram Bot] Failed to send QR image, falling back to text:', imgErr.message);
                }
            }

            return ctx.replyWithMarkdown(paymentMsg, Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Choose Another Plan', 'reselect_plan')],
                [Markup.button.callback('💬 Contact Admin', 'contact_support')]
            ]));
        });

        bot.action('reselect_plan', async (ctx) => {
            await ctx.answerCbQuery();
            return ctx.replyWithMarkdown(
                `⚡ *Select your subscription plan:*`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('👑 Lifetime Pro Access — ₹99 Only', 'plan_0_lifetime_unknown')],
                    [Markup.button.callback('💎 1 Month Pro — ₹49', 'plan_30_pro_unknown')]
                ])
            );
        });

        bot.action('contact_support', async (ctx) => {
            await ctx.answerCbQuery();
            return ctx.replyWithMarkdown(
                `💬 *Need support?*\n` +
                `You can reach our administrator directly at: Telegram @translucent_admin or email support@translucent.ai`
            );
        });

        // Handle Photo Submissions (Payment Screenshots)
        bot.on('photo', async (ctx) => {
            const chatId = ctx.chat.id;
            const order = pendingOrders.get(chatId);
            const photo = ctx.message.photo[ctx.message.photo.length - 1]; // highest resolution photo

            let user = null;
            if (order && order.userId) {
                user = await db.getUserById(order.userId);
            }

            const username = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Customer');
            const planText = order ? `${order.planName} (${order.amount})` : 'Subscription Payment';

            // Confirm to User
            await ctx.replyWithMarkdown(
                `✅ *Payment Proof Received!*\n\n` +
                `Our administrator has been notified. Your subscription will be approved and activated within a few minutes.\n\n` +
                `Once approved, simply click *Check Status / Refresh* in the Translucent desktop app!`
            );

            // Forward to Admin Chat
            if (adminChatId) {
                const adminCaption = 
                    `🚨 *NEW SUBSCRIPTION PAYMENT PROOF*\n\n` +
                    `👤 *From:* ${username} (Chat ID: \`${chatId}\`)\n` +
                    `📧 *Account Email:* ${user ? `\`${user.email}\`` : 'Not specified'}\n` +
                    `🆔 *User ID:* ${user ? user.id : 'N/A'}\n` +
                    `💎 *Plan:* ${planText}\n` +
                    `📅 *Date:* ${new Date().toLocaleString()}`;

                const duration = order ? order.durationDays : 30;
                const plan = order ? order.plan : 'pro';
                const uId = user ? user.id : (order ? order.userId : null);

                const approveBtnData = uId ? `approve_${uId}_${duration}_${plan}_${chatId}` : 'noop';

                try {
                    await ctx.telegram.sendPhoto(adminChatId, photo.file_id, {
                        caption: adminCaption,
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ Approve License Now', approveBtnData)],
                            [Markup.button.callback('❌ Reject Payment', `reject_${chatId}`)]
                        ])
                    });
                } catch (sendErr) {
                    console.error('[Telegram Bot] Failed to send proof to admin:', sendErr.message);
                }
            } else {
                console.warn('[Telegram Bot] TELEGRAM_ADMIN_CHAT_ID not configured! Send /getid to your bot to get your ID.');
            }
        });

        // Handle Text Messages (e.g. UTR / Transaction number or email)
        bot.on('text', async (ctx, next) => {
            if (ctx.message.text.startsWith('/')) return next();

            const chatId = ctx.chat.id;
            const text = ctx.message.text.trim();
            const order = pendingOrders.get(chatId);

            // If user typed their email to link account
            if (text.includes('@') && (!order || !order.userId)) {
                const user = await db.getUserByEmail(text);
                if (user) {
                    if (order) order.userId = user.id;
                    return ctx.replyWithMarkdown(
                        `✓ *Account Linked:* ${user.name} (\`${user.email}\`)\n\n` +
                        `Please send your payment screenshot or transaction ID now.`
                    );
                }
            }

            let user = null;
            if (order && order.userId) {
                user = await db.getUserById(order.userId);
            }

            const username = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Customer');
            const planText = order ? `${order.planName} (${order.amount})` : 'Subscription Payment';

            // Confirm to User
            await ctx.replyWithMarkdown(
                `📝 *Transaction Details Received!*\n\n` +
                `Ref: \`${text}\`\n\n` +
                `An administrator is verifying your payment and will activate your software license shortly!`
            );

            // Forward to Admin
            if (adminChatId) {
                const duration = order ? order.durationDays : 30;
                const plan = order ? order.plan : 'pro';
                const uId = user ? user.id : (order ? order.userId : null);

                const adminMsg = 
                    `🚨 *NEW TRANSACTION ID / UTR SUBMISSION*\n\n` +
                    `👤 *From:* ${username} (Chat ID: \`${chatId}\`)\n` +
                    `📧 *Account Email:* ${user ? `\`${user.email}\`` : 'Not specified'}\n` +
                    `🆔 *User ID:* ${uId || 'N/A'}\n` +
                    `💎 *Plan:* ${planText}\n` +
                    `📝 *Transaction Ref:* \`${text}\``;

                const approveBtnData = uId ? `approve_${uId}_${duration}_${plan}_${chatId}` : 'noop';

                try {
                    await ctx.telegram.sendMessage(adminChatId, adminMsg, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('✅ Approve License Now', approveBtnData)],
                            [Markup.button.callback('❌ Reject Payment', `reject_${chatId}`)]
                        ])
                    });
                } catch (e) {
                    console.error('[Telegram Bot] Failed to send text to admin:', e.message);
                }
            }
        });

        // Admin Action: Approve License (Handles both Telegram and Web submissions)
        bot.action(/approve_(\d+)_(\d+)_(pro|lifetime)_([a-zA-Z0-9_-]+)/, async (ctx) => {
            const userId = ctx.match[1];
            const durationDays = parseInt(ctx.match[2], 10);
            const plan = ctx.match[3];
            const userChatId = ctx.match[4];

            try {
                const updatedUser = await db.approveUser(userId, {
                    durationDays,
                    plan,
                    notes: `Paid ₹99 & verified by admin via Telegram`
                });

                await ctx.answerCbQuery('✓ License Activated!');
                await ctx.editMessageReplyMarkup(
                    Markup.inlineKeyboard([
                        [Markup.button.callback(`✅ Activated (${durationDays > 0 ? `${durationDays} Days` : 'Lifetime'})`, 'noop')]
                    ]).reply_markup
                );

                // Notify User if they initiated from Telegram
                if (userChatId && userChatId !== 'none' && userChatId !== 'web') {
                    try {
                        await ctx.telegram.sendMessage(
                            userChatId,
                            `🎉 *Payment Verified & License Activated!*\n\n` +
                            `⚡ Your *Translucent Pro* software license has been successfully unlocked.\n\n` +
                            `Return to the Translucent application on your PC and click *Check Status / Refresh* to begin using all stealth AI features!`,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (e) {
                        console.warn('[Telegram Bot] Failed to notify user in chat:', e.message);
                    }
                }
            } catch (err) {
                console.error('[Telegram Bot] Approval error:', err);
                await ctx.answerCbQuery('Error activating license');
            }
        });

        // Admin Action: Reject Payment
        bot.action(/reject_(\d+)/, async (ctx) => {
            const userChatId = ctx.match[1];
            await ctx.answerCbQuery('Payment rejected');
            await ctx.editMessageReplyMarkup(
                Markup.inlineKeyboard([
                    [Markup.button.callback('❌ Rejected', 'noop')]
                ]).reply_markup
            );

            try {
                await ctx.telegram.sendMessage(
                    userChatId,
                    `⚠️ *Payment Verification Update*\n\n` +
                    `Your payment could not be verified automatically. Please contact our support team at Telegram @translucent_admin to resolve this issue.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (e) {}
        });

        bot.action('noop', async (ctx) => {
            await ctx.answerCbQuery('Already processed.');
        });

        // Launch Bot polling
        bot.launch().then(() => {
            console.log('[Telegram Bot] 🚀 Telegram Payment & Licensing Bot is ONLINE!');
        }).catch(err => {
            console.error('[Telegram Bot] Error launching bot:', err.message);
        });

        // Enable graceful stop
        process.once('SIGINT', () => bot && bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

        return bot;
    } catch (err) {
        console.error('[Telegram Bot] Initialization failed:', err.message);
        return null;
    }
}

async function notifyAdminPayment({ user, utr, amount = '₹99', plan = 'lifetime', durationDays = 0 }) {
    if (!bot) return false;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId) return false;

    try {
        const uId = user ? user.id : 'N/A';
        const msg = 
            `🚨 *NEW PAYMENT / UTR SUBMISSION*\n\n` +
            `👤 *User:* ${user ? user.name : 'Unknown'}\n` +
            `📧 *Email:* \`${user ? user.email : 'N/A'}\`\n` +
            `🆔 *User ID:* ${uId}\n` +
            `💎 *Plan:* Lifetime Pro (${amount})\n` +
            `📝 *UTR / Txn ID:* \`${utr}\``;

        const approveBtnData = user ? `approve_${user.id}_${durationDays}_${plan}_web` : 'noop';

        await bot.telegram.sendMessage(adminChatId, msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Approve Lifetime License', approveBtnData)]
            ])
        });
        return true;
    } catch (e) {
        console.warn('[Telegram Bot] Failed to send payment alert to admin:', e.message);
        return false;
    }
}

module.exports = { initTelegramBot, notifyAdminPayment };
