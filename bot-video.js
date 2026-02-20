// bot-video.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const { getVideoUrl } = require('./scraperService');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const cache = require('./cache'); // Step 8: SQLite Shared Cache
const crypto = require('crypto');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI).then(() => console.log('🤖 Bot DB Connected.'));

const videoSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true, unique: true },
    streamUrl: { type: String, required: true },
    title: { type: String, default: 'xTeraPlay Video' },
    views: { type: Number, default: 0 },
    thumbnail: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, expires: 3600 }
});
const Video = mongoose.model('Video', videoSchema);

// Configuration
const BOT_TOKEN = '8553702014:AAFcFUvF_H24dG9FauEHhR0qu_DIz1nf8kc';
const WEBAPP_BASE_URL = process.env.WEBAPP_BASE_URL; // e.g., https://xxxx.ngrok-free.app
const bot = new Telegraf(BOT_TOKEN);

// Health Check
async function verifyWebApp() {
    try {
        const res = await fetch(`${WEBAPP_BASE_URL}/health`);
        return res.ok;
    } catch (e) {
        return false;
    }
}

bot.start((ctx) => {
    ctx.reply('👋 Welcome to xTeraPlay Official!\n\nSend me any TeraBox link and I will generate a secure, in-app player button for you. 🚀\n\nNo downloads, no limits.');
});

bot.catch((err, ctx) => {
    console.error(`[xTeraBot] Global Error:`, err);
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.includes('/s/')) return ctx.reply('❌ Please send a valid TeraBox link.');

    const isServerUp = await verifyWebApp();
    if (!isServerUp) {
        return ctx.reply('⚠️ **Server temporarily unavailable.**\nPlease ensure ngrok is running and WEBAPP_BASE_URL is updated.');
    }

    const processingMsg = await ctx.reply('⏳ **Analyzing & Securing Video...**', { parse_mode: 'Markdown' });

    try {
        const data = await getVideoUrl(text);
        if (!data || !data.videoUrl) throw new Error('Extraction failed');

        // 1. Persist to MongoDB for Community Grid
        const video = await Video.findOneAndUpdate(
            { originalUrl: text },
            {
                streamUrl: data.videoUrl,
                title: data.title,
                $inc: { views: 1 },
                createdAt: new Date()
            },
            { upsert: true, new: true } // Return the updated document
        );

        // 2. Step 8: Save to Shared SQLite Cache for Session Stability
        const sessionId = crypto.randomBytes(5).toString('hex'); // Short persistent ID
        cache.set(sessionId, data.videoUrl);

        // 3. Send Web App Button using SQLite sessionId
        await ctx.reply(`✅ **${data.title}** is ready!`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: '▶ Play in Telegram',
                        web_app: { url: `${WEBAPP_BASE_URL}/player?id=${sessionId}` }
                    }]
                ]
            }
        });

    } catch (error) {
        console.error('Bot Error:', error);
        await ctx.reply('❌ Extraction failed. Please try again later.');
    } finally {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id); } catch (e) { }
    }
});

// 3️⃣ 7️⃣ 8️⃣ Startup Verification & Instructions
bot.launch().then(() => {
    console.log('\n--- xTeraPlay Bot Initialized ---');
    console.log(`Active WebApp Domain: ${WEBAPP_BASE_URL}`);
    console.log(`Set BotFather domain to: ${WEBAPP_BASE_URL.replace("https://", "")}`);
    console.log('\n⚠️ WARNING: Free ngrok domain changes every restart.');
    console.log('Update WEBAPP_BASE_URL and BotFather after each restart.');
    console.log('--------------------------------\n');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
