// scraperService.js
const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let clusterPromise = null; // Promise-based singleton for thread-safety

/**
 * Initializes the Puppeteer Cluster (Single Instance)
 */
async function initCluster() {
    if (!clusterPromise) {
        clusterPromise = (async () => {
            console.log('[xTeraPlay] Initializing Multi-Threaded Browser Cluster...');
            const instance = await Cluster.launch({
                concurrency: Cluster.CONCURRENCY_PAGE, // Reverted for better plugin compatibility
                maxConcurrency: 3, 
                puppeteerOptions: {
                    headless: true,
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage', // Essential for Render/Docker
                        '--disable-gpu',
                        '--no-first-run'
                    ]
                },
                timeout: 120000,
                retryLimit: 1
            });

            // Define the extraction task
            await instance.task(async ({ page, data: teraboxLink }) => {
                const mem = process.memoryUsage();
                console.log(`[xTeraPlay] Job Started. Link: ${teraboxLink}`);

                page.on('error', err => console.error(`[xTeraPlay] Page Error: ${err.message}`));
                page.on('pageerror', err => console.error(`[xTeraPlay] Browser JS Error: ${err.message}`));

                // OPTIMIZATION: Block heavy resources
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const resourceType = request.resourceType();
                    if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                try {
                    console.log(`[xTeraPlay] Navigating to proxy...`);
                    // Use domcontentloaded for speed and to avoid hanging on slow trackers
                    await page.goto('https://mdiskplay.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
                    
                    console.log(`[xTeraPlay] Typing link...`);
                    const inputSelector = 'input.linkPasteBar_searchInput__lLKb9';
                    await page.waitForSelector(inputSelector, { timeout: 20000 });
                    await page.type(inputSelector, teraboxLink);
                    
                    console.log(`[xTeraPlay] Clicking search...`);
                    await page.click('.linkPasteBar_searchButton__drZLs');

                    console.log(`[xTeraPlay] Waiting for video element...`);
                    await page.waitForFunction(
                        () => {
                            const v = document.querySelector('video');
                            const s = document.querySelector('video source');
                            return (v && v.src) || (s && s.src);
                        },
                        { timeout: 60000 }
                    );

                    console.log(`[xTeraPlay] Extracting sources...`);

                    const result = await page.evaluate(() => {
                        const video = document.querySelector('video');
                        const sources = Array.from(document.querySelectorAll('video source')).map(s => s.src);
                        let allUrls = [];
                        if (video && video.src) allUrls.push(video.src);
                        allUrls = [...new Set([...allUrls, ...sources])].filter(u => u.length > 5);

                        return {
                            videoUrls: allUrls.length > 0 ? allUrls : [],
                            title: document.title.replace(" - mdiskplay.com", "").trim() || "xTeraPlay Video"
                        };
                    });

                    console.log(`[xTeraPlay] Cluster Job Success: ${result.title} (${result.videoUrls.length} links)`);
                    return result;
                } catch (err) {
                    const htmlSnippet = await page.evaluate(() => document.body.innerText.substring(0, 500));
                    console.error(`[xTeraPlay] Extraction Error: ${err.message}`);
                    console.error(`[xTeraPlay] Page Context: ${htmlSnippet}`);
                    return null;
                }
            });

            console.log('[xTeraPlay] Browser Cluster Ready (Max Concurrency: 3)');
            return instance;
        })();
    }
    return clusterPromise;
}

/**
 * Main Extraction Wrapper with Retry Logic
 */
async function getVideoUrl(teraboxLink, retryCount = 0) {
    if (teraboxLink.includes('.m3u8')) {
        return { videoUrls: [teraboxLink], title: 'Direct Stream' };
    }

    try {
        const clusterInstance = await initCluster();
        const result = await clusterInstance.execute(teraboxLink);
        
        if ((!result || !result.videoUrls || result.videoUrls.length === 0) && retryCount < 1) {
            console.log(`[xTeraPlay] Retry (${retryCount + 1}) for: ${teraboxLink}`);
            return await getVideoUrl(teraboxLink, retryCount + 1);
        }

        return result || { videoUrls: [], title: 'No Link Found' };
    } catch (error) {
        if (retryCount < 1) return await getVideoUrl(teraboxLink, retryCount + 1);
        return { videoUrls: [], title: 'System Error' };
    }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
    if (clusterPromise) {
        const clusterInstance = await clusterPromise;
        await clusterInstance.close();
    }
    process.exit();
});

module.exports = { getVideoUrl };
