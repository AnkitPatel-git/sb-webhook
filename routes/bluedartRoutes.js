const express = require('express');
const router = express.Router();
const bluedartController = require('../controllers/bluedartController');
const { authenticateBlueDart, validateIPWhitelist } = require('../middleware/bluedartAuth');

// Apply authentication middleware to all Blue Dart routes
router.use(authenticateBlueDart);

// Apply IP whitelist if enabled
router.use(validateIPWhitelist);

/**
 * POST /api/bluedart/status
 * Blue Dart Push API webhook endpoint
 * Receives shipment tracking updates from Blue Dart
 */
router.post('/status', bluedartController.processStatusWebhook);

/**
 * GET /api/bluedart/shipments
 * Get all shipments with optional filters
 * Query params: page, limit, waybill_no, ref_no
 */
router.get('/shipments', bluedartController.getAllShipments);

/**
 * GET /api/bluedart/shipments/:waybillNo
 * Get shipment details by waybill number including scans
 */
router.get('/shipments/:waybillNo', bluedartController.getShipmentByWaybill);

module.exports = router;

