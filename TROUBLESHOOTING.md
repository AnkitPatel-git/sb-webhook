# Troubleshooting Guide

## Authentication Issues

### Error: "Unauthorized: Missing client-id or token headers"

This error means the webhook endpoint is not receiving the required authentication headers.

#### Possible Causes:

1. **Headers not being sent**
   - Blue Dart (or your test client) is not including the headers
   - Check that headers are being sent: `client-id` and `token`

2. **Header name mismatch**
   - Headers must be exactly: `client-id` (with hyphen) and `token`
   - Express normalizes headers to lowercase automatically

3. **Environment variables not set**
   - Check your `.env` file has:
     ```env
     BLUEDART_CLIENT_ID=stagingID
     BLUEDART_TOKEN=your-password-here
     ```

#### How to Test:

1. **Using curl:**
   ```bash
   curl -X POST http://localhost:3000/api/bluedart/status \
     -H "client-id: stagingID" \
     -H "token: your-test-token" \
     -H "Content-Type: application/json" \
     -d '{"statustracking":[]}'
   ```

2. **Using the test script:**
   ```bash
   npm test
   # or
   node test-webhook.js
   ```

3. **Check server logs:**
   - In development mode, the server logs all headers
   - Look for: `📋 Request Headers:` in the console
   - Verify `client-id` and `token` are present

#### Debug Steps:

1. **Check if server is reading environment variables:**
   ```bash
   # Add this temporarily to server.js to verify
   console.log('Environment check:', {
     BLUEDART_CLIENT_ID: process.env.BLUEDART_CLIENT_ID,
     BLUEDART_TOKEN: process.env.BLUEDART_TOKEN ? '***set***' : 'NOT SET'
   });
   ```

2. **Verify headers are being sent:**
   - Check the server console logs
   - In development, headers are logged automatically
   - Look for the `📋 Request Headers:` output

3. **Test with Postman/curl:**
   - Make sure headers are set correctly
   - Headers should be:
     - `client-id: stagingID` (or your actual client ID)
     - `token: your-token` (or your actual token)

#### Common Mistakes:

- ❌ Using `Client-ID` instead of `client-id` (Express normalizes to lowercase)
- ❌ Using `client_id` (underscore) instead of `client-id` (hyphen)
- ❌ Not setting environment variables in `.env` file
- ❌ Forgetting to restart server after changing `.env` file
- ❌ Using wrong credentials (mismatch between `.env` and what's sent)

#### Solution:

1. **Verify your `.env` file:**
   ```env
   BLUEDART_CLIENT_ID=stagingID
   BLUEDART_TOKEN=your-actual-token-here
   ```

2. **Restart your server** after changing `.env`

3. **Test with correct headers:**
   ```bash
   curl -X POST http://localhost:3000/api/bluedart/status \
     -H "client-id: stagingID" \
     -H "token: your-actual-token-here" \
     -H "Content-Type: application/json" \
     -d '{"statustracking":[]}'
   ```

4. **Check server logs** to see what headers are actually received

## Other Common Issues

### Database Connection Errors

- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env`
- Verify MySQL is running
- Test connection: `mysql -u [user] -p [database]`

### Port Already in Use

- Change `PORT` in `.env` file
- Or kill the process using the port

### Migration Errors

- Ensure database name in `.env` matches your actual database
- Check database user has proper permissions
- Run `npm run migrate:list` to check migration status

