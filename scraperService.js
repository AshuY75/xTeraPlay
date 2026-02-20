// scraperService.js
const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let cluster;
let isInitialized = false;

/**
 * Initializes the Puppeteer Cluster
 */
async function initCluster() {
    if (!isInitialized) {
        console.log('[xTeraPlay] Launching Multi-Threaded Browser Cluster...');
        cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_PAGE,
            maxConcurrency: 5, // Optimized for 2GB+ RAM
            puppeteerOptions: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
            timeout: 120000,
            retryLimit: 1
        });

        // Define the Extraction Task
        await cluster.task(async ({ page, data: teraboxLink }) => {
            console.log(`[xTeraPlay] Cluster Job Started: ${teraboxLink}`);

            await page.goto('https://mdiskplay.com', { waitUntil: 'networkidle2', timeout: 60000 });

            await page.waitForSelector('input[placeholder*="Paste Terabox Link"]', { timeout: 10000 });
            await page.type('input[placeholder*="Paste Terabox Link"]', teraboxLink);
            await page.click('.linkPasteBar_searchButton__drZLs');

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

            await page.waitForFunction(
                () => {
                    const video = document.querySelector('video');
                    return video && video.src && video.src.includes('.m3u8');
                },
                { timeout: 60000 }
            );

            const result = await page.evaluate(() => {
                const video = document.querySelector('video');
                return {
                    videoUrl: video ? video.src : null,
                    title: document.title.replace(" - mdiskplay.com", "").trim() || "TeraBox Video"
                };
            });

            console.log(`[xTeraPlay] Cluster Job Success: ${result.title}`);
            return result;
        });

        isInitialized = true;
    }
    return cluster;
}

/**
 * Main Extraction Wrapper with Concurrency and Direct Link Detection
 */
async function getVideoUrl(teraboxLink) {
    // 1. Direct Link Fast-Pass
    if (teraboxLink.includes('.m3u8') || teraboxLink.includes('source.m3u8')) {
        console.log('[xTeraPlay] Direct Link Detected. Instant Playback.');
        return { videoUrl: teraboxLink, title: 'Direct Stream' };
    }

    // 2. Queue Job in Cluster
    try {
        const clusterInstance = await initCluster();
        return await clusterInstance.execute(teraboxLink);
    } catch (error) {
        console.error(`[xTeraPlay] Cluster Error: ${error.message}`);
        return null;
    }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
    if (cluster) {
        console.log('[xTeraPlay] Closing Browser Cluster...');
        await cluster.close();
    }
    process.exit();
});

module.exports = { getVideoUrl };
