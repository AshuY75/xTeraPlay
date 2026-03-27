// bot.js (Optimized Bot + Multiple Links + Verification)
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getVideoUrl } = require('./scraperService');
// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error('❌ ERROR: BOT_TOKEN is missing in .env file!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const activeUsers = new Map(); // Concurrency Control

// --- Helper: Link Verification ---
async function verifyLink(url) {
    try {
        const response = await axios({
            method: 'get',
            url: url,
            timeout: 5000,
            headers: {
                'Referer': 'https://mdiskplay.com/',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        return response.status === 200 && (response.data.includes('#EXTM3U') || response.headers['content-type']?.includes('mpegurl'));
    } catch (e) {
        return false;
    }
}

// (Server Routes Removed)

// --- Bot Logic ---

bot.start((ctx) => {
    ctx.reply('👋 **Welcome!** Send me a TeraBox link to extract videos.', { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    const userId = ctx.from.id; // Switch to User-Level Lock
    const text = ctx.message.text.trim();
    if (!text.includes('/s/')) return;

    // Concurrency Check
    if (activeUsers.has(userId)) {
        console.log(`[xTeraBot] Blocked concurrent request from User: ${userId}`);
        return ctx.reply('⏳ **Please wait!** I am already processing a link for you. One at a time, please. 🚀', { parse_mode: 'Markdown' });
    }

    activeUsers.set(userId, true);
    console.log(`[xTeraBot] [REQ] Processing for User: ${userId}...`);
    console.time(`User-${userId}`);

    const processingMsg = await ctx.reply('⏳ **Analyzing & Verifying Links...**\nThis typically takes 15-20 seconds.', { parse_mode: 'Markdown' });

    try {
        const data = await getVideoUrl(text);
        if (data && data.videoUrls && data.videoUrls.length > 0) {

            // Limit to top 3 for verification
            const candidates = data.videoUrls.slice(0, 3);
            let directLinks = [];

            // Verify and collect links
            for (let i = 0; i < candidates.length; i++) {
                const url = candidates[i];
                const isWorking = await verifyLink(url);
                if (isWorking) {
                    directLinks.push({ text: `📹 Video Link ${i + 1}`, url: url });
                }
            }

            // Fallback: If none verified, send the first one anyway
            if (directLinks.length === 0 && candidates.length > 0) {
                 directLinks.push({ text: `📹 Video Link 1`, url: candidates[0] });
            }

            const keyboard = [];
            // Group direct links in pairs
            for (let i = 0; i < directLinks.length; i += 2) {
                keyboard.push(directLinks.slice(i, i + 2));
            }

            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                `✅ **${data.title}**\n\nFound ${data.videoUrls.length} links. Here are the top sources:`,
                { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }
            );
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '❌ No videos found or extraction failed. Please try again.');
        }
    } catch (error) {
        console.error('Bot Error:', error);
        ctx.reply('❌ System error occurred during extraction.');
    } finally {
        activeUsers.delete(userId); // Release Lock
        console.timeEnd(`User-${userId}`);
        console.log(`[xTeraBot] [DONE] Lock released for User: ${userId}`);
    }
});

// Removed app.listen as Express is removed
bot.launch().then(() => console.log('🤖 Bot Online.'));
process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(); });
