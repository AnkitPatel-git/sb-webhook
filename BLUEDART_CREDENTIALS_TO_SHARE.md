# Blue Dart Webhook Integration - Credentials & Configuration

**To:** Blue Dart Technical Team  
**From:** [Your Company Name]  
**Date:** [Current Date]  
**Subject:** Webhook Endpoint Configuration for Push API Integration

---

## 📋 Webhook Endpoint Information

We have set up a webhook endpoint to receive shipment tracking updates from Blue Dart Push API. Please configure your system to send webhook notifications to the following endpoint:

### Webhook Endpoint URL

**Staging/Test Environment:**
```
POST https://[your-staging-domain]/api/bluedart/status
```

**Production Environment:**
```
POST https://[your-production-domain]/api/bluedart/status
```

---

## 🔐 Authentication Credentials

**IMPORTANT:** Please use the following credentials in the HTTP headers when calling our webhook endpoint:

### Test/Staging Environment Credentials

**Header: `client-id`** = `stagingID`  
**Header: `token`** = `[Your Staging Password Here]`

### Production Environment Credentials

**Header: `client-id`** = `LiveID`  
**Header: `token`** = `[Your Production Password Here]`

**Note:** Replace `[Your Staging Password Here]` and `[Your Production Password Here]` with the actual passwords you will use.

---

## 📡 Request Format

**HTTP Method:** `POST`  
**Content-Type:** `application/json`  
**Endpoint:** `/api/bluedart/status`

### Required HTTP Headers

```
client-id: [User ID from credentials above]
token: [Password from credentials above]
Content-Type: application/json
```

### Example Request

```bash
curl -X POST https://your-domain.com/api/bluedart/status \
  -H "client-id: stagingID" \
  -H "token: your-password-here" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### Request Body

The endpoint expects the standard Blue Dart Push API JSON payload format:

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

---

## ✅ Expected Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "processed": 1,
  "shipments": [...]
}
```

### Error Responses

- **400 Bad Request** - Invalid payload structure
- **401 Unauthorized** - Invalid or missing credentials
- **403 Forbidden** - IP address not whitelisted (if enabled)
- **500 Internal Server Error** - Server error (will trigger retry)

**Important:** 
- The endpoint will return `200 OK` only when the webhook is successfully processed
- Any non-200 response will trigger Blue Dart's retry mechanism
- Please ensure credentials are correctly set in headers

---

## 🔍 Health Check Endpoint

For monitoring and verification purposes, you can check the webhook endpoint status:

```
GET https://[your-domain]/health
```

**Response:**
```json
{
  "success": true,
  "message": "Blue Dart Webhook API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛡️ IP Whitelisting (Optional)

If you require IP whitelisting, please provide us with the IP addresses that Blue Dart will use to send webhook requests. We can configure our server to only accept requests from those IPs.

Alternatively, we can whitelist the following Blue Dart IPs if needed:
- Production: `14.142.125.213`, `14.142.125.214`
- UAT: `14.142.125.218`

---

## 📝 Configuration Checklist for Blue Dart

Please configure your system with:

- [ ] **Webhook URL:** `https://[your-domain]/api/bluedart/status`
- [ ] **HTTP Method:** `POST`
- [ ] **Authentication Header:** `client-id: [User ID]`
- [ ] **Authentication Header:** `token: [Password]`
- [ ] **Content-Type Header:** `application/json`
- [ ] **Payload Format:** Standard Blue Dart Push API JSON format
- [ ] **Retry Logic:** Configure retries for non-200 responses
- [ ] **SSL/TLS:** Ensure HTTPS is used (port 443)

---

## 🧪 Testing Instructions

1. **Test with Staging Credentials:**
   - Use staging endpoint URL
   - Use staging credentials (`client-id: stagingID`, `token: [staging-password]`)
   - Send a test payload
   - Verify you receive `200 OK` response

2. **Test with Production Credentials:**
   - Use production endpoint URL
   - Use production credentials (`client-id: LiveID`, `token: [production-password]`)
   - Send a test payload
   - Verify you receive `200 OK` response

---

## 📞 Contact Information

**Technical Contact:** [Your Name]  
**Email:** [Your Email]  
**Phone:** [Your Phone]  
**Company:** [Your Company Name]

**Support:** For any issues or questions regarding the webhook integration, please contact us at [Your Email].

---

## ✅ Next Steps

1. **Configure Credentials:** Set up the provided credentials in your Blue Dart system
2. **Test Connection:** Test the webhook endpoint using staging credentials
3. **Verify Response:** Ensure you receive `200 OK` responses
4. **Go Live:** Once testing is successful, switch to production credentials
5. **Monitor:** Monitor webhook calls and responses

---

**Status:** Ready for Configuration  
**Action Required:** Please configure the webhook endpoint with the provided credentials and confirm when testing is complete.

---

**Security Note:** Please keep these credentials secure and do not share them publicly. If credentials are compromised, please notify us immediately so we can regenerate them.


