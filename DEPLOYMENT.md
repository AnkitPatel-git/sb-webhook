# Deployment

Environment-specific values live in `.env` (not in PM2 config).
Each branch/server has its own `.env`. Copy `env.example` and fill it in.

```env
NODE_ENV=development
PORT=3010
PM2_APP_NAME=webhook
```

Production example:

```env
NODE_ENV=production
PORT=3011
PM2_APP_NAME=webhook
```

`ecosystem.config.js` only defines the process. Port, database, and credentials come from `.env`.

## PM2

```bash
npm run pm2:start
npm run pm2:restart
npm run pm2:stop
npm run pm2:logs
npm run pm2:status
npm run pm2:delete
```

If two environments run on the same host, give each checkout a different `PM2_APP_NAME` and `PORT`.
