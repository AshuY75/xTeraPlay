# xTeraPlay Bot - Free Deployment Guide 🚀

Since this bot uses **Puppeteer** (a headless browser), it requires specific system dependencies (Chromium) to run. The most reliable way to deploy it for free is using **Docker**.

## Option 1: Koyeb (Recommended - Very Reliable)
Koyeb has a great free tier and supports Docker natively.
1.  **Create a GitHub Repository**: Upload your project files (excluding `node_modules` and `.env`).
2.  **Add a `Dockerfile`**: Create a file named `Dockerfile` in your project root (I have provided one below).
3.  **Deploy on Koyeb**:
    - Select "GitHub" as the source.
    - Set your **Environment Variables**: `BOT_TOKEN` and `MONGODB_URI` (if needed).
    - Koyeb will automatically build and run the bot.

## Option 2: Render (Easy but slow)
Render allows free Node.js hosting but Puppeteer requires a "Build Filter" or Docker.
1.  **Docker Method**: Choose "Web Service" -> "Deploy from Docker".
2.  **Environment Variables**: Add `BOT_TOKEN`.
*Note: Render's free tier "sleeps" after 15 mins of inactivity. To keep it alive, you can use a service like `cron-job.org` to ping your health URL (if restored) or ignore the sleep if usage is constant.*

## Option 3: Railway (Fastest Setup)
1.  Connect your GitHub repo.
2.  Railway will detect the `Dockerfile` and deploy instantly.
*Note: Railway is now a trial-based service, but gives decent free credits initially.*

---

## The Dockerfile (Essential for all options)
Create a file named `Dockerfile` in your project with this content:

```dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Start the bot
CMD ["node", "bot.js"]
```

## Running it for Free Forever?
For a 100% free, always-on VPS, try **Oracle Cloud Always Free**. It gives you a powerful ARM instance (4 CPUs, 24GB RAM) which can easily handle 50+ concurrent users for this bot. It is more complex to set up (requires Linux knowledge) but it is the best option.
