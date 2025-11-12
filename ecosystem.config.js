module.exports = {
  apps: [
    {
      name: "bluedart-webhook-api",
      script: "./server.js",
      instances: 1, // Set to 'max' to use all CPU cores, or a number for specific instances
      exec_mode: "fork", // Use 'cluster' mode if instances > 1
      watch: false, // Set to true for development (auto-restart on file changes)
      max_memory_restart: "500M", // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true, // Prepend timestamp to logs
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
