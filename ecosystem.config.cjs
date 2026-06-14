module.exports = {
  apps: [
    {
      name: "handypay-ai-agent",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "300M",
      time: true
    }
  ]
};
