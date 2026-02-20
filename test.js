// test.js
const { getVideoUrl } = require("./scraper");

// Replace with a real TeraBox link (use one that works on mdiskplay.com)
const testLink = "https://teraboxlink.com/s/1sRmiw446hsRnkHmUIoPRfQ";

getVideoUrl(testLink).then((url) => {
  if (url) {
    console.log("✅ Success! Video URL:", url);
  } else {
    console.log("❌ Failed to get video URL.");
  }
});
