const pool = require("../config/database");
const path = require("path");

/**
 * Extract filename from a file path
 * @param {string} filePath - Full file path
 * @returns {string} - Just the filename
 */
function extractFilename(filePath) {
  if (!filePath) return null;
  return path.basename(filePath);
}

/**
 * Sanitize image data in an object - replace base64/images with just filenames
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeImages(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // If it's a string that looks like base64 image
  if (typeof obj === "string") {
    // Check if it's a base64 image (starts with data:image/ or is very long base64 string)
    if (
      obj.startsWith("data:image/") ||
      (obj.length > 100 && /^[A-Za-z0-9+/=]+$/.test(obj))
    ) {
      return "[IMAGE_DATA_REMOVED]";
    }
    // If it's a file path, extract just the filename
    if (obj.includes("/") || obj.includes("\\")) {
      return extractFilename(obj);
    }
    return obj;
  }

  // If it's an array
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeImages(item));
  }

  // If it's an object
  if (typeof obj === "object") {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        // Check for common image field names
        if (
          key.toLowerCase().includes("image") ||
          key.toLowerCase().includes("signature") ||
          key.toLowerCase().includes("picture") ||
          key.toLowerCase().includes("photo") ||
          key === "IDImage" ||
          key === "Signature" ||
          key === "Pictures" ||
          key === "PODImage" ||
          key === "DCImage" ||
          key === "RWImageURL"
        ) {
          if (Array.isArray(value)) {
            sanitized[key] = value.map((item) => {
              if (typeof item === "string") {
                if (item.startsWith("data:image/")) {
                  return "[IMAGE_DATA_REMOVED]";
                }
                return extractFilename(item);
              }
              return "[IMAGE_DATA_REMOVED]";
            });
          } else if (typeof value === "string") {
            if (value.startsWith("data:image/")) {
              sanitized[key] = "[IMAGE_DATA_REMOVED]";
            } else {
              sanitized[key] = extractFilename(value);
            }
          } else {
            sanitized[key] = "[IMAGE_DATA_REMOVED]";
          }
        } else {
          sanitized[key] = sanitizeImages(value);
        }
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Log request and response to database
 * This is the first task - logs incoming request before processing
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} apiEndpoint - API endpoint path
 * @param {Object} responseData - Response data to log
 * @param {number} statusCode - HTTP status code
 */
async function logRequestResponse(
  req,
  res,
  apiEndpoint,
  responseData,
  statusCode
) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const clientId =
      req.clientId ||
      req.headers["client-id"] ||
      req.headers["client_id"] ||
      "unknown";

    // Sanitize request body (remove base64 images, keep only filenames)
    // const sanitizedRequestBody = sanitizeImages(req.body);
    const sanitizedRequestBody = req.body;

    // Sanitize response data (remove base64 images, keep only filenames)
    // const sanitizedResponseData = sanitizeImages(responseData);
    const sanitizedResponseData = responseData;
    // Extract waybill number from request if available
    let waybillNo = null;
    if (req.body?.statustracking && Array.isArray(req.body.statustracking)) {
      const firstShipment = req.body.statustracking[0]?.Shipment;
      if (firstShipment?.WaybillNo) {
        waybillNo = firstShipment.WaybillNo;
      }
    } else if (req.params?.waybillNo) {
      waybillNo = req.params.waybillNo;
    }

    // Prepare headers JSON (store all headers)
    const headersJson = {};
    for (const key in req.headers) {
      if (req.headers.hasOwnProperty(key)) {
        headersJson[key] = req.headers[key];
      }
    }

    // Prepare request log
    const requestLog = {
      method: req.method,
      url: req.originalUrl || req.url,
      path: apiEndpoint,
      body: sanitizedRequestBody,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
    };

    // Prepare response log
    const responseLog = {
      statusCode: statusCode,
      data: sanitizedResponseData,
      timestamp: new Date().toISOString(),
    };

    // Insert into webhook_audit_log
    await pool.execute(
      `INSERT INTO webhook_audit_log (
        waybill_no, 
        payload, 
        response_status, 
        response_message, 
        error_message, 
        client_ip, 
        client_id,
        api_endpoint,
        headers,
        request_data,
        response_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        waybillNo,
        JSON.stringify(sanitizedRequestBody), // Keep for backward compatibility
        statusCode,
        responseLog.data?.message || responseLog.data?.success
          ? "Success"
          : "Error",
        responseLog.data?.error || responseLog.data?.message || null,
        clientIP,
        clientId,
        apiEndpoint,
        JSON.stringify(headersJson), // Store all headers as JSON
        JSON.stringify(requestLog), // Full request details in JSON
        JSON.stringify(responseLog), // Full response details in JSON
      ]
    );

    console.log(
      `📝 Logged request: ${req.method} ${apiEndpoint} - Client: ${clientId} - Status: ${statusCode}`
    );
  } catch (logError) {
    // Don't throw error - logging should not break the application
    console.error("❌ Error logging request/response:", logError.message);
  }
}

/**
 * Middleware to log request before processing
 * This runs first before any other processing
 */
function logRequestMiddleware(req, res, next) {
  // Store original res.json to capture response
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Log after response is ready
    const statusCode = res.statusCode || 200;
    const apiEndpoint = req.originalUrl || req.url;

    // Log asynchronously (don't block response)
    logRequestResponse(req, res, apiEndpoint, data, statusCode).catch((err) => {
      console.error("Failed to log request:", err);
    });

    // Call original res.json
    return originalJson(data);
  };

  next();
}

module.exports = {
  logRequestResponse,
  logRequestMiddleware,
  sanitizeImages,
  extractFilename,
};
