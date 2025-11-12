/**
 * Blue Dart Authentication Middleware
 * Validates client-id and token from headers
 */

const authenticateBlueDart = (req, res, next) => {
  const clientId = req.headers['client-id'];
  const token = req.headers['token'];
  
  // Get credentials from environment variables
  const validClientId = process.env.BLUEDART_CLIENT_ID || 'stagingID';
  const validToken = process.env.BLUEDART_TOKEN || 'your-test-token';
  
  // Validate credentials
  if (!clientId || !token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing client-id or token headers'
    });
  }
  
  if (clientId !== validClientId || token !== validToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid credentials'
    });
  }
  
  // Store client info for logging
  req.clientId = clientId;
  next();
};

/**
 * IP Whitelist Middleware (Optional)
 * Whitelist Blue Dart IPs for production
 */
const validateIPWhitelist = (req, res, next) => {
  // Only apply in production
  if (process.env.NODE_ENV === 'production' && process.env.BLUEDART_ENABLE_IP_WHITELIST === 'true') {
    const clientIP = req.ip || req.connection.remoteAddress;
    const allowedIPs = [
      '14.142.125.213', // Production
      '14.142.125.214', // Production
      '14.142.125.218'  // UAT
    ];
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: IP address not whitelisted'
      });
    }
  }
  
  next();
};

module.exports = {
  authenticateBlueDart,
  validateIPWhitelist
};

