# Deployment Guide

## Environment Configuration

The application supports both development and production environments. Simply change the environment variables in your `.env` file.

### Development Environment
- **URL**: http://dev.webhook.sbfasto.com
- **Port**: 3010
- **PM2 Name**: `webhook-dev`

### Production Environment
- **URL**: http://webhook.sbfasto.com
- **Port**: 3011
- **PM2 Name**: `webhook`

## Setup Instructions

### 1. Environment Variables

Create a `.env` file based on `env.example`:

**For Development:**
```env
NODE_ENV=development
PORT=3010
# ... other configs
```

**For Production:**
```env
NODE_ENV=production
PORT=3011
# ... other configs
```

### 2. PM2 Commands

#### Development
```bash
# Start development server
npm run pm2:start:dev

# Stop development server
npm run pm2:stop:dev

# Restart development server
npm run pm2:restart:dev

# View logs
npm run pm2:logs:dev

# Delete process
npm run pm2:delete:dev
```

#### Production
```bash
# Start production server
npm run pm2:start:prod

# Stop production server
npm run pm2:stop:prod

# Restart production server
npm run pm2:restart:prod

# View logs
npm run pm2:logs:prod

# Delete process
npm run pm2:delete:prod
```

### 3. Quick Switch Between Environments

To switch from development to production (or vice versa):

1. Update `.env` file:
   - Change `NODE_ENV` to `development` or `production`
   - Change `PORT` to `3010` (dev) or `3011` (prod)

2. Restart the appropriate PM2 process:
   ```bash
   # For development
   npm run pm2:restart:dev
   
   # For production
   npm run pm2:restart:prod
   ```

### 4. Running Both Environments Simultaneously

You can run both development and production servers at the same time:

```bash
# Start both
npm run pm2:start:dev
npm run pm2:start:prod

# Check status
npm run pm2:status
```

## Notes

- The server automatically uses the correct port based on `NODE_ENV` if `PORT` is not set
- PM2 process names: `webhook-dev` (development) and `webhook` (production)
- Logs are stored in `./logs/` directory with separate files for each environment
- All configuration is controlled through `.env` file - no code changes needed

