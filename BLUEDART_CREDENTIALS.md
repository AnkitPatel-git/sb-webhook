# Blue Dart Webhook Integration - Credentials & Configuration

This document contains the information that needs to be shared with Blue Dart for webhook integration setup.

## 📋 Webhook Endpoint Information

### Webhook URL
```
POST https://your-domain.com/api/bluedart/status
```

**Note:** Replace `your-domain.com` with your actual production domain.

### Authentication Headers Required

Blue Dart needs to send the following headers with each webhook request:

```
client-id: [User ID from credentials below]
token: [Password from credentials below]
Content-Type: application/json
```

## 🔐 Credentials

**IMPORTANT:** These are the credentials YOU will provide to Blue Dart. Blue Dart will use these in HTTP headers when calling your webhook endpoint.

### Test/Staging Environment

**User ID:** `stagingID` (sent in `client-id` header)  
**Password:** `[Set your staging password]` (sent in `token` header)

**Webhook URL (Staging):**
```
POST https://your-staging-domain.com/api/bluedart/status
```

### Production/Live Environment

**User ID:** `LiveID` (sent in `client-id` header)  
**Password:** `[Set your production password]` (sent in `token` header)

**Webhook URL (Production):**
```
POST https://your-production-domain.com/api/bluedart/status
```

**Note:** 
- Set secure passwords for both environments
- Share these credentials with Blue Dart
- Configure the same credentials in your `.env` file
- Blue Dart will authenticate using these credentials in HTTP headers

## 📡 Webhook Endpoint Details

### Request Format

**Method:** `POST`  
**Content-Type:** `application/json`  
**Endpoint:** `/api/bluedart/status`

### Expected Response

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "processed": 1,
  "shipments": [...]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid payload structure
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - IP not whitelisted (if enabled)
- `500 Internal Server Error` - Server error (will trigger retry)

### Important Notes

1. **Response Codes:** Blue Dart will retry on non-200 responses. The endpoint will return `200 OK` only when the webhook is successfully processed.

2. **Retry Behavior:** Blue Dart will retry 3 times if the server returns:
   - 5xx status codes
   - Any non-200 response

3. **Payload Format:** The endpoint expects the standard Blue Dart Push API payload format with `statustracking` array.

## 🛡️ IP Whitelisting (Production)

For production environment, IP whitelisting can be enabled. The following Blue Dart IPs should be whitelisted:

**Production IPs:**
- `14.142.125.213`
- `14.142.125.214`

**UAT/Staging IP:**
- `14.142.125.218`

**Note:** IP whitelisting is optional and can be enabled/disabled via environment configuration.

## 🔍 Health Check Endpoint

For monitoring and verification purposes:

```
GET https://your-domain.com/health
```

**Response:**
```json
{
  "success": true,
  "message": "Blue Dart Webhook API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Information to Share with Blue Dart

Use the document `BLUEDART_CREDENTIALS_TO_SHARE.md` to share with Blue Dart. It includes:

1. **Webhook Endpoint URL** (for both staging and production)
2. **Authentication Credentials** that YOU provide to Blue Dart:
   - Test/Staging: `client-id: stagingID`, `token: [your-staging-password]`
   - Production: `client-id: LiveID`, `token: [your-production-password]`
3. **Request Format:** POST to `/api/bluedart/status` with JSON payload
4. **Required Headers:** Blue Dart must include `client-id` and `token` headers
5. **Expected Response:** 200 OK with JSON response body
6. **Server IP Address** (if IP whitelisting is required)

**Steps:**
1. Set your passwords in `BLUEDART_CREDENTIALS_TO_SHARE.md`
2. Configure the same credentials in your `.env` file
3. Share `BLUEDART_CREDENTIALS_TO_SHARE.md` with Blue Dart
4. Blue Dart will use these credentials in headers when calling your webhook

## ✅ Testing Checklist

Before going live, ensure:

- [ ] Webhook endpoint is accessible from Blue Dart servers
- [ ] Authentication credentials are correctly configured
- [ ] Test webhook call is successful
- [ ] Response format matches expected structure
- [ ] Health check endpoint is responding
- [ ] IP whitelisting is configured (if enabled)
- [ ] SSL/TLS certificate is valid (HTTPS)
- [ ] Server can handle expected webhook volume

## 📞 Contact Information

**For Blue Dart Support:**
- Contact your Blue Dart account manager
- Reference: Push API Webhook Integration
- Provide this document for configuration

---

**Last Updated:** [Date]  
**Environment:** Staging / Production  
**Status:** Pending Blue Dart Configuration

