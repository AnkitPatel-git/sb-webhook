const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const bluedartRoutes = require("./routes/bluedartRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
// Port configuration: 3010 for development, 3011 for production
const PORT =
  process.env.PORT || (process.env.NODE_ENV === "production" ? 3011 : 3010);

// Middleware
app.use(cors());
// Increase body parser limit for large payloads
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy for accurate IP addresses (important for IP whitelisting)
app.set("trust proxy", true);

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`
  );

  // Log headers for debugging (only for Blue Dart routes in development)
  if (
    process.env.NODE_ENV === "development" &&
    req.path.includes("/api/bluedart")
  ) {
    console.log("📋 Request Headers:", {
      "client-id": req.headers["client-id"],
      client_id: req.headers["client_id"],
      "license key": req.headers["license key"],
      "license-key": req.headers["license-key"],
      "License Key": req.headers["License Key"],
      "content-type": req.headers["content-type"],
      "user-agent": req.headers["user-agent"],
    });
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Blue Dart Webhook API is running",
    timestamp: new Date().toISOString(),
  });
});

// Blue Dart API routes
app.use("/api/bluedart", bluedartRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Blue Dart Webhook API",
    endpoints: {
      health: "/health",
      webhook: "/api/bluedart/status",
      shipments: "/api/bluedart/shipments",
      shipment: "/api/bluedart/shipments/:waybillNo",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Blue Dart Webhook Server is running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(
    `🔗 Webhook endpoint: http://localhost:${PORT}/api/bluedart/status`
  );
  console.log(
    `📦 Shipments API: http://localhost:${PORT}/api/bluedart/shipments`
  );
});

module.exports = app;
