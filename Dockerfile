# Use the official Puppeteer image which includes Chromium
FROM ghcr.io/puppeteer/puppeteer:latest

# Set environment to production
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package files and install
# We use root for install to ensure permissions are handled by the base image properly
USER root
COPY package*.json ./
RUN npm install --production

# Copy the rest of the source code
COPY . .

# Change ownership to the pptruser (provided by the base image for security)
RUN chown -R pptruser:pptruser /app

# Switch back to the non-root user
USER pptruser

# The bot doesn't strictly need a port, but Koyeb might expect one for a Web Service.
# Since this is a worker bot, you can deploy it as a "Worker" on Koyeb.
# If deploying as a "Web Service", keep this port:
EXPOSE 3000

# Start the bot
CMD ["node", "bot.js"]
