---
description: How to run the TeraBox Video Player
---

# Running the TeraBox Video Player

Follow these steps to get the project up and running on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 16 or higher recommended)
- [NPM](https://www.npmjs.com/) (Installed with Node.js)

### Step-by-Step Instructions

1. **Install Dependencies**
   Open your terminal in the project directory and run:
   // turbo
   ```bash
   npm install
   ```

2. **Start the Server**
   Run the following command to start the Express backend:
   // turbo
   ```bash
   npm start
   ```
   You should see a message: `Server running at http://localhost:3000`.

3. **Open the Player**
   Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

4. **Play a Video**
   - Paste a valid TeraBox link (e.g., `https://terabox.com/s/...`) into the input field.
   - Click **"Extract Video"**.
   - Wait for the extraction to complete (it may take up to 60 seconds).
   - Once extracted, the video player will appear and start playing automatically.

### Troubleshooting
- **Scraping Timeout**: If extraction fails, try again. The backend uses Puppeteer, which depends on network speed and the target site's response time.
- **Port Conflict**: If port 3000 is occupied, you can change the port in `server.js` or set the `PORT` environment variable.
