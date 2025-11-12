# Environment Setup

Create a `.env` file in the root directory with the following content:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bluedart_db

# Blue Dart Authentication
BLUEDART_CLIENT_ID=stagingID
BLUEDART_TOKEN=your-test-token

# Blue Dart IP Whitelist (Optional - only for production)
BLUEDART_ENABLE_IP_WHITELIST=false
```

## Steps to Set Up:

1. Copy this content to a new file named `.env` in the root directory
2. Replace `your_password` with your actual MySQL password
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
