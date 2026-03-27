# xTeraPlay Bot - Render Deployment Guide 🚀

To deploy this bot on **Render** (Free Tier), follow these steps. We use **Docker** to ensure all Puppeteer dependencies are present.

## 1. Prepare your GitHub
- Your code is already pushed to: [https://github.com/AshuY75/xTeraPlay](https://github.com/AshuY75/xTeraPlay)

## 2. Create a Web Service on Render
1.  Go to the **Render Dashboard** and click **New +** -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Name**: Give it a name (e.g., `xteraplay-bot`).
4.  **Runtime**: Select **Docker**. (Render will automatically find your `Dockerfile`).
5.  **Region**: Select the one closest to you (e.g., Singapore or Frankfurt).
6.  **Instance Type**: Select **Free**.

## 3. Set Environment Variables
Go to the **Environment** tab and add:
- `BOT_TOKEN`: Your Telegram Bot Token.
- `PORT`: 3000 (Render uses this for health checks).

## 4. Deploy!
- Click **Create Web Service**.
- Wait for the build to finish. Once the logs say `🤖 Bot Online`, your bot is live!

---

### Important Notes for Render Free Tier:
- **Spin Down**: The free tier "spins down" after 15 minutes of inactivity. This means the first link a user sends after a long break might take 30-60 seconds to respond as the server "wakes up".
- **Keep-Alive**: To prevent spinning down, you can use a free service like `cron-job.org` to ping your Render URL (found at the top of your dashboard) every 10 minutes.
