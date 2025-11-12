/**
 * Blue Dart Authentication Middleware
 * Validates client-id and License Key from headers
 */

const authenticateBlueDart = (req, res, next) => {
  // Try multiple header name variations (case-insensitive)
  // Express normalizes headers to lowercase, but handle both formats
  const clientId =
    req.headers["client-id"] ||
    req.headers["client_id"] ||
    req.headers["Client-ID"] ||
    req.headers["CLIENT-ID"];

  // License Key header - Express normalizes to lowercase, spaces may become hyphens
  const licenseKey =
    req.headers["license key"] ||
    req.headers["license-key"] ||
    req.headers["License Key"] ||
    req.headers["License-Key"] ||
    req.headers["LICENSE KEY"] ||
    req.headers["LICENSE-KEY"] ||
    req.headers["license_key"] ||
    req.headers["License_Key"];

  // Get credentials from environment variables
  const validClientId = process.env.BLUEDART_CLIENT_ID || "stagingID";
  const validLicenseKey =
    process.env.BLUEDART_LICENSE_KEY ||
    process.env.BLUEDART_TOKEN ||
    "your-test-token";

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Auth Debug - Received headers:", {
      "client-id": req.headers["client-id"],
      client_id: req.headers["client_id"],
      "license key": req.headers["license key"],
      "license-key": req.headers["license-key"],
      license_key: req.headers["license_key"],
      "all-headers": Object.keys(req.headers).filter(
        (k) =>
          k.toLowerCase().includes("client") ||
          k.toLowerCase().includes("license")
      ),
    });
  }

  // Validate credentials
  if (!clientId || !licenseKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing client-id or License Key headers",
      hint: "Please include headers: client-id and License Key",
    });
  }

  if (clientId !== validClientId || licenseKey !== validLicenseKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid credentials",
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
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BLUEDART_ENABLE_IP_WHITELIST === "true"
  ) {
    const clientIP = req.ip || req.connection.remoteAddress;
    const allowedIPs = [
      "14.142.125.213", // Production
      "14.142.125.214", // Production
      "14.142.125.218", // UAT
    ];

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: IP address not whitelisted",
      });
    }
  }

  next();
};

module.exports = {
  authenticateBlueDart,
  validateIPWhitelist,
};
