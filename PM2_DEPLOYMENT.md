# PM2 Deployment Guide

This guide explains how to deploy and manage the Blue Dart Webhook API using PM2.

## Prerequisites

1. **Install PM2 globally** (recommended):

   ```bash
   npm install -g pm2
   ```

   Or use the local version (installed as dev dependency):

   ```bash
   npm install
   ```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Logs Directory

```bash
mkdir -p logs
```

### 3. Start the Application with PM2

```bash
# Using npm script
npm run pm2:start

# Or directly with PM2
pm2 start ecosystem.config.js
```

### 4. Verify the Application is Running

```bash
npm run pm2:status
# or
pm2 status
```

## PM2 Management Commands

### Using npm scripts:

```bash
npm run pm2:start      # Start the application
npm run pm2:stop       # Stop the application
npm run pm2:restart    # Restart the application
npm run pm2:delete     # Remove from PM2 (stops and deletes)
npm run pm2:logs       # View logs
npm run pm2:monit      # Open monitoring dashboard
npm run pm2:status     # Check status
```

### Using PM2 directly:

```bash
pm2 start ecosystem.config.js
pm2 stop bluedart-webhook-api
pm2 restart bluedart-webhook-api
pm2 delete bluedart-webhook-api
pm2 logs bluedart-webhook-api
pm2 monit
pm2 status
pm2 info bluedart-webhook-api
```

## Important PM2 Commands

### Save PM2 Process List

After starting your application, save the PM2 process list so it auto-starts on server reboot:

```bash
pm2 save
pm2 startup
```

The `pm2 startup` command will generate a command to run as root/sudo that sets up PM2 to start on system boot.

### View Logs

```bash
# View all logs
pm2 logs bluedart-webhook-api

# View only error logs
pm2 logs bluedart-webhook-api --err

# View only output logs
pm2 logs bluedart-webhook-api --out

# View last 100 lines
pm2 logs bluedart-webhook-api --lines 100
```

### Monitor Application

```bash
# Real-time monitoring dashboard
pm2 monit

# Or view detailed info
pm2 describe bluedart-webhook-api
```

### Restart Strategies

```bash
# Restart immediately
pm2 restart bluedart-webhook-api

# Graceful reload (zero-downtime)
pm2 reload bluedart-webhook-api

# Restart with zero downtime (cluster mode)
pm2 reload ecosystem.config.js
```

## Configuration

The PM2 configuration is in `ecosystem.config.js`. Key settings:

- **instances**: Number of instances (1 = single instance, 'max' = all CPU cores)
- **exec_mode**: 'fork' for single instance, 'cluster' for multiple instances
- **max_memory_restart**: Auto-restart if memory exceeds this limit
- **watch**: Set to `true` for development (auto-restart on file changes)
- **autorestart**: Automatically restart on crashes
- **env**: Environment variables for production
- **env_development**: Environment variables for development

### Running in Development Mode

```bash
pm2 start ecosystem.config.js --env development
```

### Running in Production Mode

```bash
pm2 start ecosystem.config.js --env production
# or simply
pm2 start ecosystem.config.js
```

## Environment Variables

Make sure your `.env` file is properly configured before starting PM2. The application will read environment variables from `.env` file.

## Scaling the Application

To run multiple instances (cluster mode), update `ecosystem.config.js`:

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'  // Enable cluster mode
```

Then restart:

```bash
pm2 restart ecosystem.config.js
```

## Troubleshooting

### Application won't start

1. Check logs: `pm2 logs bluedart-webhook-api`
2. Verify environment variables are set correctly
3. Check if the port is already in use
4. Verify database connection settings

### Application keeps restarting

1. Check error logs: `pm2 logs bluedart-webhook-api --err`
2. Check memory usage: `pm2 monit`
3. Verify application code for errors

### View detailed information

```bash
pm2 describe bluedart-webhook-api
```

## Log Files

PM2 logs are stored in the `logs/` directory:

- `pm2-error.log`: Error logs
- `pm2-out.log`: Standard output logs
- `pm2-combined.log`: Combined logs

## Production Checklist

- [ ] Install PM2 globally or ensure it's in devDependencies
- [ ] Create `.env` file with all required environment variables
- [ ] Create `logs/` directory
- [ ] Test the application locally with PM2
- [ ] Configure PM2 to start on system boot (`pm2 startup` and `pm2 save`)
- [ ] Set up log rotation (PM2 has built-in log rotation)
- [ ] Monitor application health regularly
- [ ] Configure firewall rules if needed
- [ ] Set up reverse proxy (nginx/Apache) if needed

## Log Rotation

PM2 has built-in log rotation. To enable it:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

This will:

- Rotate logs when they reach 10MB
- Keep 7 days of logs
- Compress old logs

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
