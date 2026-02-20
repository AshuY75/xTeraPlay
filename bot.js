// bot.js
const { Telegraf } = require('telegraf');
const { getVideoUrl } = require('./scraper');

// xTeraPlay Official Bot Token
const BOT_TOKEN = '8553702014:AAFcFUvF_H24dG9FauEHhR0qu_DIZ1nf8kc';

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply('👋 Welcome to xTeraPlay Official Bot!\n\nSend me any TeraBox link (e.g., https://teraboxlink.com/s/...) and I will extract the high-speed streaming link for you. 🚀');
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();

    // Flexible validation: check for "/s/" or common domains
    const allowedDomains = ['terabox', 'terashare', '1024terabox'];
    const isValid = allowedDomains.some(d => text.includes(d)) || text.includes('/s/');

    if (!isValid) {
        return ctx.reply('❌ Please send a valid TeraBox share link (containing "/s/").');
    }

    // Send a professional processing message
    const processingMsg = await ctx.reply('⏳ **Analyzing Link...**\nOur extraction engine is processing your request. This typically takes 10-30 seconds.', { parse_mode: 'Markdown' });

    try {
        const data = await getVideoUrl(text);

        if (data && data.videoUrl) {
            // Success response
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                `✅ **Extraction Successful!**\n\n📄 **Title:** ${data.title}\n\n📹 **Streaming URL (M3U8):**\n\`${data.videoUrl}\`\n\n💡 *Tip: You can use this link in VLC, MX Player, or our website.*`,
                { parse_mode: 'Markdown', disable_web_page_preview: true }
            );
        } else {
            // Failure response
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                '❌ **Extraction Failed**\nThe link might be expired or protected. Please try another one.'
            );
        }
    } catch (error) {
        console.error('Bot error:', error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            null,
            '❌ **System Error**\nAn unexpected error occurred during extraction. Please try again later.'
        );
    }
});

// Launch logic
bot.launch()
    .then(() => console.log('🤖 xTeraPlay Telegram Bot is Online.'))
    .catch((err) => console.error('Bot failed to launch:', err));

// Proper process management
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
