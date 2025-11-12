# Blue Dart Webhook Setup - Information to Share

**Date:** [Current Date]  
**Contact:** [Your Name/Company]  
**Integration Type:** Push API Webhook

---

## Webhook Endpoint URLs

### Staging/Test Environment
```
POST https://[your-staging-domain]/api/bluedart/status
```

### Production Environment
```
POST https://[your-production-domain]/api/bluedart/status
```

---

## Authentication Credentials

**IMPORTANT:** These credentials must be included in HTTP headers when Blue Dart calls our webhook endpoint.

### Test/Staging Environment
- **Header `client-id`:** `stagingID`
- **Header `token`:** `[Your Staging Password - Set this value]`

### Production Environment
- **Header `client-id`:** `LiveID`
- **Header `token`:** `[Your Production Password - Set this value]`

**Instructions for Blue Dart:**
- Include these credentials as HTTP headers in every webhook request
- Header name: `client-id` with value from above
- Header name: `token` with password value from above

---

## Request Specifications

**HTTP Method:** `POST`  
**Content-Type:** `application/json`  
**Endpoint Path:** `/api/bluedart/status`

**Required Headers:**
```
client-id: [User ID from above]
token: [Password from above]
Content-Type: application/json
```

**Request Body:** Standard Blue Dart Push API JSON payload format

---

## Response Specifications

**Success Response:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "success": true,
    "message": "Webhook processed successfully",
    "processed": [number],
    "shipments": [...]
  }
  ```

**Error Responses:**
- `400 Bad Request` - Invalid payload
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - IP not whitelisted
- `500 Internal Server Error` - Server error (will trigger retry)

**Important:** Blue Dart will retry on non-200 responses. Only return `200 OK` when webhook is successfully processed.

---

## Server Information

**Server IP Address:** `[Your Server IP]`  
**Protocol:** HTTPS (SSL/TLS required)  
**Port:** 443 (standard HTTPS)

---

## IP Whitelisting (Optional)

If IP whitelisting is enabled, please whitelist the following Blue Dart IPs:

**Production IPs:**
- `14.142.125.213`
- `14.142.125.214`

**UAT/Staging IP:**
- `14.142.125.218`

---

## Health Check Endpoint

For monitoring and verification:

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

## Testing

Please test the webhook integration using:

1. **Staging Environment First:**
   - Use staging credentials
   - Send test payload to staging endpoint
   - Verify response is `200 OK`

2. **Production Environment:**
   - Use production credentials
   - Send test payload to production endpoint
   - Verify response is `200 OK`

---

## Additional Notes

- The webhook endpoint processes multiple shipments in a single request
- All webhook requests are logged for audit purposes
- The endpoint handles retries safely (idempotent operations)
- SSL/TLS certificate is valid and up-to-date

---

## Contact Information

**Technical Contact:** [Your Name]  
**Email:** [Your Email]  
**Phone:** [Your Phone]  
**Company:** [Your Company Name]

---

**Status:** Ready for Blue Dart Configuration  
**Next Steps:** 
1. Set the password values in this document
2. Share this document with Blue Dart
3. Configure the same credentials in your `.env` file
4. Await Blue Dart confirmation of successful integration

