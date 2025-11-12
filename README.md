# Blue Dart Push API Webhook

A secure webhook endpoint for receiving and processing Blue Dart shipment tracking updates via HTTP POST requests.

## 🔍 Overview

The Blue Dart Push API provides shipment tracking updates via HTTP POST requests to your server. This implementation:

- ✅ Creates a secure webhook endpoint in Express.js
- ✅ Validates and logs incoming payloads
- ✅ Stores shipment and scan data in MySQL
- ✅ Handles retries safely
- ✅ Provides authentication and IP whitelisting

## ⚙️ System Architecture

```
Blue Dart ERP → Push API (JSON) → Your Webhook Endpoint (/api/bluedart/status)
                                     ↓
                               Express.js Server
                                     ↓
                              MySQL Database
```

## 🧩 Prerequisites

- Node.js ≥ 18
- MySQL ≥ 8
- npm or yarn

## 📁 Project Structure

```
sb-webhook/
├── config/
│   └── database.js              # MySQL connection pool
├── controllers/
│   └── bluedartController.js    # Blue Dart webhook processing logic
├── middleware/
│   ├── bluedartAuth.js          # Authentication & IP whitelist
│   └── errorHandler.js          # Error handling middleware
├── routes/
│   └── bluedartRoutes.js        # Blue Dart API routes
├── database/
│   └── schema.sql               # Database schema
├── .env                         # Environment variables (create this)
├── .gitignore
├── package.json
├── server.js                    # Main server file
├── sample_payload.json           # Sample payload for testing
└── README.md
```

## 🚀 Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Create a `.env` file (see `ENV_SETUP.md` for template):
   ```env
   PORT=3000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=bluedart_db
   BLUEDART_CLIENT_ID=stagingID
   BLUEDART_TOKEN=your-test-token
   ```

3. **Set up the database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Webhook Endpoint (Blue Dart Push API)

**POST** `/api/bluedart/status`

Receives shipment tracking updates from Blue Dart.

**Headers:**
```
client-id: stagingID
token: your-test-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "statustracking": [
    {
      "Shipment": {
        "WaybillNo": "1234567890",
        "SenderID": "12345",
        "ReceiverID": "67890",
        "Scans": {
          "ScanDetail": [...]
        }
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "processed": 1,
  "shipments": [...]
}
```

### Query Endpoints

**GET** `/api/bluedart/shipments`

Get all shipments with optional filters.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `waybill_no` - Filter by waybill number
- `ref_no` - Filter by reference number

**GET** `/api/bluedart/shipments/:waybillNo`

Get shipment details by waybill number including all scans.

**GET** `/health`

Health check endpoint.

## 🔐 Authentication

The webhook endpoint requires authentication via headers:

- `client-id`: Your Blue Dart client ID
- `token`: Your Blue Dart authentication token

These are validated against environment variables:
- `BLUEDART_CLIENT_ID`
- `BLUEDART_TOKEN`

## 🛡️ IP Whitelisting (Production)

For production, you can enable IP whitelisting to only accept requests from Blue Dart IPs:

**Production IPs:**
- `14.142.125.213`
- `14.142.125.214`

**UAT IP:**
- `14.142.125.218`

Set `BLUEDART_ENABLE_IP_WHITELIST=true` in your `.env` file for production.

## 🗃️ Database Schema

### shipments
Stores shipment information including waybill number, origin, destination, dates, etc.

### scans
Stores scan/tracking details for each shipment including location, time, status, etc.

### webhook_audit_log
Logs all incoming webhook requests for audit and debugging purposes.

See `database/schema.sql` for complete schema.

## 🔁 Retry Handling

Blue Dart retries 3 times if your server returns:

- **5xx** - Internal server/network errors
- **Non-200** response codes

**Important:** Your server must return `200 OK` only when processed successfully. Any other status code will trigger retries.

## 🧪 Testing

### Using curl

```bash
curl -X POST http://localhost:3000/api/bluedart/status \
  -H "Content-Type: application/json" \
  -H "client-id: stagingID" \
  -H "token: your-test-token" \
  -d @sample_payload.json
```

### Using Postman

1. Import the sample payload from `sample_payload.json`
2. Set method to `POST`
3. URL: `http://localhost:3000/api/bluedart/status`
4. Headers:
   - `client-id: stagingID`
   - `token: your-test-token`
   - `Content-Type: application/json`
5. Body: Copy content from `sample_payload.json`

## 📊 Response Codes

| HTTP Code | Meaning |
|-----------|---------|
| 200 | Successfully processed |
| 400 | Invalid payload |
| 401 | Authentication failed |
| 403 | IP not whitelisted (if enabled) |
| 500 | Server error (will trigger retry) |

## ✅ Best Practices

- ✅ Validate payload structure before saving
- ✅ Maintain audit logs for each push
- ✅ Use HTTPS in production
- ✅ Whitelist Blue Dart IPs in production
- ✅ Return 200 OK only when successfully processed
- ✅ Handle errors gracefully to avoid unnecessary retries
- ✅ Log all webhook requests for debugging

## 🔍 Example Responses

### Success Response
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "processed": 1,
  "shipments": [
    {
      "waybill_no": "1234567890",
      "shipment_id": 1,
      "status": "processed"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Invalid payload: statustracking array is required"
}
```

## 🐛 Debugging

All webhook requests are logged in the `webhook_audit_log` table. You can query it to see:

- Incoming payloads
- Response status codes
- Error messages
- Client IP addresses
- Processing timestamps

```sql
SELECT * FROM webhook_audit_log 
ORDER BY processed_at DESC 
LIMIT 10;
```

## 📝 Notes

- The webhook endpoint processes multiple shipments in a single request
- Duplicate scans are automatically prevented
- Shipments are updated if they already exist (based on waybill number)
- All dates are parsed from DD-MM-YYYY format
- The system handles both single and multiple scan details

## 🔒 Security

- Authentication via client-id and token headers
- Optional IP whitelisting for production
- Input validation and sanitization
- SQL injection protection via parameterized queries
- Error messages don't expose sensitive information in production

## 📄 License

ISC

## 🤝 Support

For issues and questions, please refer to the Blue Dart Push API documentation or contact support.
