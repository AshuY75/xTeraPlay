const express = require('express');
const { getVideoUrl } = require('./scraperService');
require('dotenv').config(); // Load environment variables
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const cors = require('cors'); // 1️⃣1️⃣ Enabled CORS

const app = express();
const PORT = process.env.PORT || 3000;
const cache = require('./cache'); // Step 8: SQLite Shared Cache

app.use(cors()); // Enable CORS for Telegram WebApp

// Production MongoDB Atlas Connection
// Note: In production, store the full URI in an environment variable MONGO_URI
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('xTeraPlay DB Connected (Atlas)'))
    .catch(err => console.error('Database connection failed.')); // Sanitized log

// Production-Grade Cyclic Video Model (1-Hour Cycle)
const videoSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true, unique: true },
    streamUrl: { type: String, required: true }, // 3️⃣ Zero Truncation Key
    title: { type: String, default: 'xTeraPlay Video' },
    views: { type: Number, default: 0 },
    thumbnail: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // 4️⃣ Auto-delete after 1 hour (TTL)
}, { timestamps: false });

const Video = mongoose.model('Video', videoSchema);

// Security: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://pagead2.googlesyndication.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://*"],
            connectSrc: ["'self'", "https://*"],
            mediaSrc: ["'self'", "https://*", "blob:"],
            frameSrc: ["'self'", "https://googleads.g.doubleclick.net"]
        },
    },
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html'))); // Explicit Route
app.use('/api/', limiter);

// 1️⃣ Fix 404 DEPLOYMENT_NOT_FOUND (Explicit Routing)
app.get('/health', (req, res) => res.status(200).send("OK")); // 5️⃣ Debug Route
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));

/**
 * Production Deployment Recommendation:
 * - Deploy to a VPS (e.g., DigitalOcean, Hetzner) or Render.
 * - Use a static domain (e.g., xteraplay.com).
 * - Remove ngrok dependency for production stability.
 */

// Fallback for other HTML routes (About, Contact, etc.)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', `${page}.html`);
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// API Routes
app.post('/api/extract', async (req, res) => {
    const { teraboxUrl } = req.body;

    // Basic validation
    if (!teraboxUrl || !teraboxUrl.includes('terabox')) {
        return res.status(400).json({ success: false, error: 'Invalid TeraBox URL' });
    }

    try {
        let video = await Video.findOne({ originalUrl: teraboxUrl });

        if (video) {
            console.log("Fetched URL Length:", video.streamUrl.length);
            // Refresh TTL and update views
            video.views += 1;
            video.createdAt = new Date(); // Refresh TTL
            await video.save();
            return res.json({ success: true, streamUrl: video.streamUrl, title: video.title });
        }

        const data = await getVideoUrl(teraboxUrl);
        if (data && data.videoUrl) {
            // 3️⃣ Full Stream URL Storage Verification
            console.log("Saving URL Length:", data.videoUrl.length);

            video = new Video({
                originalUrl: teraboxUrl,
                streamUrl: data.videoUrl,
                title: data.title,
                views: 1
            });
            await video.save();
            res.json({ success: true, streamUrl: data.videoUrl, title: data.title });
        } else {
            res.status(500).json({ success: false, error: 'Extraction failed' });
        }
    } catch (error) {
        // No sensitive logs here
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

app.get('/api/recent', async (req, res) => {
    try {
        const videos = await Video.find({}).sort({ createdAt: -1 }).limit(12);
        res.json(videos);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// 2️⃣ Step 8: Fetch from Shared SQLite Cache or MongoDB
app.get('/api/video/:id', async (req, res) => {
    const { id } = req.params;

    // 1. Try SQLite Local Cache (Primary for current sessions)
    const cachedUrl = cache.get(id);
    if (cachedUrl) {
        return res.json({ videoUrl: cachedUrl });
    }

    // 2. Fallback to MongoDB (For history/community picks)
    try {
        const video = await Video.findById(id);
        if (video) {
            console.log("Fetched Stream URL Length (DB):", video.streamUrl.length);
            res.json({ videoUrl: video.streamUrl });
        } else {
            res.status(404).json({ error: 'Video expired or not found' });
        }
    } catch (err) {
        res.status(400).json({ error: 'Invalid Session ID' });
    }
});

app.post('/api/view', async (req, res) => {
    const { url } = req.body;
    try {
        await Video.updateOne({ originalUrl: url }, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).end();
    }
});

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('Missing parameter');

    try {
        const isManifest = targetUrl.includes('.m3u8');
        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: isManifest ? 'text' : 'stream',
            headers: {
                'Referer': 'https://mdiskplay.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (isManifest) {
            let manifestContent = response.data;
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            const rewrittenManifest = manifestContent.split('\n').map(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    let absoluteUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).toString();
                    return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                }
                return line;
            }).join('\n');
            res.set('Content-Type', response.headers['content-type'] || 'application/vnd.apple.mpegurl');
            res.send(rewrittenManifest);
        } else {
            res.set({
                'Content-Type': response.headers['content-type'],
                'Content-Length': response.headers['content-length'],
                'Access-Control-Allow-Origin': '*'
            });
            response.data.pipe(res);
        }
    } catch (error) {
        res.status(500).send('Proxy error');
    }
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: http://${req.headers.host}/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>http://${req.headers.host}/</loc><priority>1.0</priority></url>
    <url><loc>http://${req.headers.host}/about</loc><priority>0.8</priority></url>
    <url><loc>http://${req.headers.host}/contact</loc><priority>0.8</priority></url>
    <url><loc>http://${req.headers.host}/privacy</loc><priority>0.5</priority></url>
</urlset>`);
});

// Contact API with Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS // Gmail App Password
    }
});

app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await transporter.sendMail({
            from: email,
            to: 'sonyoive12@gmail.com',
            subject: `xTeraPlay Contact from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Final Fallback
app.use((req, res) => {
    res.status(404).send("Route Not Found");
});

app.listen(PORT, () => console.log('xTeraPlay Production Server Online.'));
