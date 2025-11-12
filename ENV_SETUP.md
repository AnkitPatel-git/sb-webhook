# Environment Setup

## Quick Setup

Copy the example environment file and update with your values:

```bash
cp env.example .env
```

Then edit `.env` and update the following values:
- `DB_PASSWORD` - Your MySQL database password
- `DB_NAME` - Your database name (default: bluedart_db)
- `BLUEDART_CLIENT_ID` - Your Blue Dart client ID
- `BLUEDART_TOKEN` - Your Blue Dart authentication token
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Set to `production` for production environment

## Environment Variables

The `.env` file should contain the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=bluedart_db

# Blue Dart Authentication
BLUEDART_CLIENT_ID=stagingID
BLUEDART_TOKEN=your-test-token

# Blue Dart IP Whitelist (Optional - only for production)
BLUEDART_ENABLE_IP_WHITELIST=false
```

## Steps to Set Up:

1. Copy `env.example` to `.env`: `cp env.example .env`
2. Replace `your_database_password` with your actual MySQL password
3. Update `BLUEDART_CLIENT_ID` and `BLUEDART_TOKEN` with your Blue Dart credentials
4. Update other values as needed for your environment
5. Make sure `.env` is in your `.gitignore` (it already is)

## Database Setup:

After creating the `.env` file, run the database schema:

```bash
mysql -u root -p < database/schema.sql
```

Or connect to MySQL and run the SQL file manually:

```sql
mysql -u root -p
source database/schema.sql
```

## Blue Dart IP Whitelist (Production)

For production, enable IP whitelisting and ensure your server can detect the correct client IP:

- Production IPs: `14.142.125.213`, `14.142.125.214`
- UAT IP: `14.142.125.218`

Set `BLUEDART_ENABLE_IP_WHITELIST=true` in production.
