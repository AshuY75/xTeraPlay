#!/bash
# xTeraPlay VPS Setup Script
# Ubuntu/Debian Standard

echo "🚀 Starting xTeraPlay VPS Environment Setup..."

# Step 2: Update & Basic Tools
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential

# Step 3: Install Node.js 18
echo "🟢 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Step 4: Puppeteer & FFmpeg Dependencies
echo "🎭 Installing Puppeteer & FFmpeg dependencies..."
sudo apt install -y gconf-service libgbm-dev libasound2 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
sudo apt install -y ffmpeg

# Step 5: SQLite (Optional for Shared State, MongoDB Atlas Recommended)
echo "🗄️ Installing SQLite3..."
sudo apt install -y sqlite3

# Install PM2 for Process Management
echo "⚡ Installing PM2 Globally..."
sudo npm install -g pm2

echo "✅ Setup Complete!"
node --version
npm --version
ffmpeg -version
