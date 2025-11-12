# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create `.env` File
Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bluedart_db
BLUEDART_CLIENT_ID=stagingID
BLUEDART_TOKEN=your-test-token
```

### Step 3: Set Up Database
```bash
mysql -u root -p < database/schema.sql
```

Or manually:
```sql
mysql -u root -p
source database/schema.sql
```

### Step 4: Start the Server
```bash
npm run dev
```

You should see:
```
🚀 Server is running on port 3000
✅ MySQL database connected successfully
```

### Step 5: Test the Webhook

**Option 1: Using the test script**
```bash
node test-webhook.js
```

**Option 2: Using curl**
```bash
curl -X POST http://localhost:3000/api/bluedart/status \
  -H "Content-Type: application/json" \
  -H "client-id: stagingID" \
  -H "token: your-test-token" \
  -d @sample_payload.json
```

**Option 3: Using Postman**
1. Method: POST
2. URL: `http://localhost:3000/api/bluedart/status`
3. Headers:
   - `client-id: stagingID`
   - `token: your-test-token`
   - `Content-Type: application/json`
4. Body: Copy from `sample_payload.json`

### Step 6: Verify Data

Check if data was saved:
```sql
mysql -u root -p bluedart_db

-- Check shipments
SELECT * FROM shipments;

-- Check scans
SELECT * FROM scans;

-- Check audit log
SELECT * FROM webhook_audit_log ORDER BY processed_at DESC LIMIT 5;
```

## ✅ Success Indicators

- Server starts without errors
- Database connection successful
- Webhook returns `200 OK`
- Data appears in `shipments` and `scans` tables
- Audit log entry created

## 🐛 Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Authentication Error (401)
- Check `BLUEDART_CLIENT_ID` and `BLUEDART_TOKEN` in `.env`
- Verify headers in request match environment variables

### Port Already in Use
- Change `PORT` in `.env` to a different port (e.g., 3001)
- Or stop the process using port 3000

### Payload Validation Error (400)
- Ensure payload has `statustracking` array
- Check JSON format is valid
- Verify `WaybillNo` is present in each shipment

## 📚 Next Steps

- Review `README.md` for complete documentation
- Check `ENV_SETUP.md` for environment configuration
- Customize authentication in `middleware/bluedartAuth.js`
- Add additional validation as needed

