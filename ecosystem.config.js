module.exports = {
    apps: [
        {
            name: "xteraplay-server",
            script: "server.js",
            env: {
                NODE_ENV: "production",
            }
        },
        {
            name: "xteraplay-bot",
            script: "bot-video.js",
            env: {
                NODE_ENV: "production",
            }
        }
    ]
};
