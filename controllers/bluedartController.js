const pool = require('../config/database');

/**
 * Blue Dart Webhook Status Endpoint
 * Processes incoming shipment tracking updates from Blue Dart Push API
 */
const processStatusWebhook = async (req, res) => {
  const startTime = Date.now();
  let processedShipments = [];
  let errors = [];
  
  try {
    const { statustracking } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const clientId = req.clientId || req.headers['client-id'];
    
    // Validate payload structure
    if (!statustracking || !Array.isArray(statustracking)) {
      // Log invalid payload
      await logWebhookAudit(null, 400, 'Invalid payload: statustracking array missing', null, clientIP, clientId, req.body);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: statustracking array is required'
      });
    }
    
    // Process each shipment in the array
    for (const entry of statustracking) {
      try {
        const shipment = entry.Shipment;
        
        if (!shipment || !shipment.WaybillNo) {
          errors.push({ error: 'Missing Shipment or WaybillNo', entry });
          continue;
        }
        
        // 1️⃣ Insert or update shipment
        const [existing] = await pool.execute(
          'SELECT id FROM shipments WHERE waybill_no = ?',
          [shipment.WaybillNo]
        );
        
        let shipmentId;
        
        if (existing.length === 0) {
          // Insert new shipment
          const [result] = await pool.execute(
            `INSERT INTO shipments (
              sender_id, receiver_id, waybill_no, ref_no, prod_code, sub_product_code,
              feature, origin, origin_area_code, destination, destination_area_code,
              pickup_date, pickup_time, expected_delivery_date, shipment_mode, weight, dynamic_expected_delivery_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              STR_TO_DATE(?, '%d-%m-%Y'), ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, STR_TO_DATE(?, '%d-%m-%Y'))`,
            [
              shipment.SenderID || null,
              shipment.ReceiverID || null,
              shipment.WaybillNo,
              shipment.RefNo || null,
              shipment.Prodcode || null,
              shipment.SubProductCode || null,
              shipment.Feature || null,
              shipment.Origin || null,
              shipment.OriginAreaCode || null,
              shipment.Destination || null,
              shipment.DestinationAreaCode || null,
              shipment.PickUpDate || null,
              shipment.PickUpTime || null,
              shipment.ExpectedDeliveryDate || null,
              shipment.ShipmentMode || null,
              shipment.Weight ? parseFloat(shipment.Weight) : 0,
              shipment.DynamicExpectedDeliveryDate || null,
            ]
          );
          shipmentId = result.insertId;
        } else {
          // Update existing shipment
          shipmentId = existing[0].id;
          
          // Update shipment fields if provided
          await pool.execute(
            `UPDATE shipments SET
              expected_delivery_date = COALESCE(STR_TO_DATE(?, '%d-%m-%Y'), expected_delivery_date),
              dynamic_expected_delivery_date = COALESCE(STR_TO_DATE(?, '%d-%m-%Y'), dynamic_expected_delivery_date),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              shipment.ExpectedDeliveryDate || null,
              shipment.DynamicExpectedDeliveryDate || null,
              shipmentId
            ]
          );
        }
        
        // 2️⃣ Insert scans
        // Handle both Push API Lite and Plus formats
        let scansToProcess = [];
        
        // Push API Lite: Scan data directly on Shipment object
        if (shipment.Scan || shipment.ScanCode) {
          scansToProcess.push({
            ScanType: shipment.ScanType,
            ScanGroupType: shipment.ScanGroupType,
            ScanCode: shipment.ScanCode,
            Scan: shipment.Scan,
            ScanDate: shipment.ScanDate,
            ScanTime: shipment.ScanTime,
            ScannedLocationCode: shipment.ScannedLocationCode,
            ScannedLocation: null,
            ScannedLocationCity: null,
            ScannedLocationStateCode: null,
            Comments: shipment.Comments,
            StatusTimeZone: null,
            StatusLatitude: null,
            StatusLongitude: null,
            ReachedDestinationLocation: null,
            SecureCode: null,
            ReceivedBy: null,
            Relation: null,
            IDType: null,
            IDNumber: null,
            QCType: null,
            QCReason: null
          });
        }
        
        // Push API Plus: Scan data in Scans.ScanDetail array
        if (shipment.Scans && shipment.Scans.ScanDetail) {
          const scanDetails = Array.isArray(shipment.Scans.ScanDetail) 
            ? shipment.Scans.ScanDetail 
            : [shipment.Scans.ScanDetail];
          
          scansToProcess.push(...scanDetails);
        }
        
        // Process all scans
        for (const scan of scansToProcess) {
          // Check if scan already exists (avoid duplicates)
          const [existingScan] = await pool.execute(
            `SELECT id FROM scans 
             WHERE shipment_id = ? AND scan_code = ? AND scan_date = STR_TO_DATE(?, '%d-%m-%Y') AND scan_time = ?`,
            [
              shipmentId,
              scan.ScanCode || null,
              scan.ScanDate || null,
              scan.ScanTime || null
            ]
          );
          
          if (existingScan.length === 0) {
            await pool.execute(
              `INSERT INTO scans (
                shipment_id, scan_type, scan_group_type, scan_code, scan, scan_date,
                scan_time, scanned_location_code, scanned_location, scanned_location_city, 
                scanned_location_state_code, comments, status_timezone, status_latitude, 
                status_longitude, reached_destination_location, secure_code, received_by,
                relation, id_type, id_number, qc_type, qc_reason
              ) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shipmentId,
                scan.ScanType || null,
                scan.ScanGroupType || null,
                scan.ScanCode || null,
                scan.Scan || null,
                scan.ScanDate || null,
                scan.ScanTime || null,
                scan.ScannedLocationCode || null,
                scan.ScannedLocation || null,
                scan.ScannedLocationCity || null,
                scan.ScannedLocationStateCode || null,
                scan.Comments || null,
                scan.StatusTimeZone || null,
                scan.StatusLatitude || null,
                scan.StatusLongitude || null,
                scan.ReachedDestinationLocation || null,
                scan.SecureCode || null,
                scan.ReceivedBy || null,
                scan.Relation || null,
                scan.IDType || null,
                scan.IDNumber || null,
                scan.QCType || null,
                scan.QCReason || null,
              ]
            );
          }
        }
        
        // 3️⃣ Insert delivery details (Push API Plus only)
        if (shipment.Scans && shipment.Scans.DeliveryDetails) {
          const deliveryDetails = shipment.Scans.DeliveryDetails;
          
          // Check if delivery details already exist
          const [existingDelivery] = await pool.execute(
            'SELECT id FROM delivery_details WHERE shipment_id = ?',
            [shipmentId]
          );
          
          if (existingDelivery.length === 0) {
            await pool.execute(
              `INSERT INTO delivery_details (
                shipment_id, received_by, relation, id_type, id_number, 
                security_code_delivery, signature, id_image
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shipmentId,
                deliveryDetails.ReceivedBy || null,
                deliveryDetails.Relation || null,
                deliveryDetails.IDType || null,
                deliveryDetails.IDNumber || null,
                deliveryDetails.SecurityCodeDelivery || null,
                deliveryDetails.Signature || null,
                deliveryDetails.IDImage || null
              ]
            );
          } else {
            // Update existing delivery details
            await pool.execute(
              `UPDATE delivery_details SET
                received_by = COALESCE(?, received_by),
                relation = COALESCE(?, relation),
                id_type = COALESCE(?, id_type),
                id_number = COALESCE(?, id_number),
                security_code_delivery = COALESCE(?, security_code_delivery),
                signature = COALESCE(?, signature),
                id_image = COALESCE(?, id_image)
              WHERE shipment_id = ?`,
              [
                deliveryDetails.ReceivedBy || null,
                deliveryDetails.Relation || null,
                deliveryDetails.IDType || null,
                deliveryDetails.IDNumber || null,
                deliveryDetails.SecurityCodeDelivery || null,
                deliveryDetails.Signature || null,
                deliveryDetails.IDImage || null,
                shipmentId
              ]
            );
          }
        }
        
        // 4️⃣ Insert reweigh information (Push API Plus only)
        if (shipment.Scans && shipment.Scans.Reweigh) {
          const reweigh = shipment.Scans.Reweigh;
          
          // Check if reweigh already exists
          const [existingReweigh] = await pool.execute(
            'SELECT id FROM reweigh WHERE shipment_id = ?',
            [shipmentId]
          );
          
          if (existingReweigh.length === 0) {
            await pool.execute(
              `INSERT INTO reweigh (
                shipment_id, mps_number, rw_actual_weight, rw_length, 
                rw_breadth, rw_height, rw_vol_weight
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                shipmentId,
                reweigh.MPSNumber || null,
                reweigh.RWActualWeight ? parseFloat(reweigh.RWActualWeight) : null,
                reweigh.RWLength ? parseFloat(reweigh.RWLength) : null,
                reweigh.RWBreadth ? parseFloat(reweigh.RWBreadth) : null,
                reweigh.RWHeight ? parseFloat(reweigh.RWHeight) : null,
                reweigh.RWVolWeight ? parseFloat(reweigh.RWVolWeight) : null
              ]
            );
          } else {
            // Update existing reweigh
            await pool.execute(
              `UPDATE reweigh SET
                mps_number = COALESCE(?, mps_number),
                rw_actual_weight = COALESCE(?, rw_actual_weight),
                rw_length = COALESCE(?, rw_length),
                rw_breadth = COALESCE(?, rw_breadth),
                rw_height = COALESCE(?, rw_height),
                rw_vol_weight = COALESCE(?, rw_vol_weight)
              WHERE shipment_id = ?`,
              [
                reweigh.MPSNumber || null,
                reweigh.RWActualWeight ? parseFloat(reweigh.RWActualWeight) : null,
                reweigh.RWLength ? parseFloat(reweigh.RWLength) : null,
                reweigh.RWBreadth ? parseFloat(reweigh.RWBreadth) : null,
                reweigh.RWHeight ? parseFloat(reweigh.RWHeight) : null,
                reweigh.RWVolWeight ? parseFloat(reweigh.RWVolWeight) : null,
                shipmentId
              ]
            );
          }
        }
        
        processedShipments.push({
          waybill_no: shipment.WaybillNo,
          shipment_id: shipmentId,
          status: 'processed'
        });
        
      } catch (entryError) {
        console.error(`Error processing shipment entry:`, entryError);
        errors.push({
          waybill_no: entry.Shipment?.WaybillNo || 'unknown',
          error: entryError.message
        });
      }
    }
    
    // Log successful processing
    const processingTime = Date.now() - startTime;
    await logWebhookAudit(
      processedShipments.length > 0 ? processedShipments[0].waybill_no : null,
      200,
      `Processed ${processedShipments.length} shipment(s)`,
      null,
      clientIP,
      clientId,
      req.body
    );
    
    // Return success response (200 OK is critical for Blue Dart retry logic)
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      processed: processedShipments.length,
      shipments: processedShipments,
      ...(errors.length > 0 && { errors })
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log error
    await logWebhookAudit(
      null,
      500,
      'Server error',
      error.message,
      req.ip || req.connection.remoteAddress,
      req.clientId || req.headers['client-id'],
      req.body
    );
    
    // Return 500 error (Blue Dart will retry)
    res.status(500).json({
      success: false,
      message: 'Server error processing webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Log webhook audit trail
 */
const logWebhookAudit = async (waybillNo, responseStatus, responseMessage, errorMessage, clientIP, clientId, payload) => {
  try {
    await pool.execute(
      `INSERT INTO webhook_audit_log (
        waybill_no, payload, response_status, response_message, error_message, client_ip, client_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        waybillNo,
        JSON.stringify(payload),
        responseStatus,
        responseMessage,
        errorMessage,
        clientIP,
        clientId
      ]
    );
  } catch (logError) {
    console.error('Error logging webhook audit:', logError);
  }
};

/**
 * Get shipment by waybill number
 */
const getShipmentByWaybill = async (req, res) => {
  try {
    const { waybillNo } = req.params;
    
    const [shipments] = await pool.execute(
      'SELECT * FROM shipments WHERE waybill_no = ?',
      [waybillNo]
    );
    
    if (shipments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }
    
    const shipment = shipments[0];
    
    // Get scans for this shipment
    const [scans] = await pool.execute(
      'SELECT * FROM scans WHERE shipment_id = ? ORDER BY scan_date DESC, scan_time DESC',
      [shipment.id]
    );
    
    // Get delivery details
    const [deliveryDetails] = await pool.execute(
      'SELECT * FROM delivery_details WHERE shipment_id = ? ORDER BY created_at DESC LIMIT 1',
      [shipment.id]
    );
    
    // Get reweigh information
    const [reweigh] = await pool.execute(
      'SELECT * FROM reweigh WHERE shipment_id = ? ORDER BY created_at DESC LIMIT 1',
      [shipment.id]
    );
    
    res.json({
      success: true,
      data: {
        ...shipment,
        scans: scans,
        delivery_details: deliveryDetails.length > 0 ? deliveryDetails[0] : null,
        reweigh: reweigh.length > 0 ? reweigh[0] : null
      }
    });
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all shipments with pagination
 */
const getAllShipments = async (req, res) => {
  try {
    const { page = 1, limit = 50, waybill_no, ref_no } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM shipments WHERE 1=1';
    const params = [];
    
    if (waybill_no) {
      query += ' AND waybill_no LIKE ?';
      params.push(`%${waybill_no}%`);
    }
    
    if (ref_no) {
      query += ' AND ref_no LIKE ?';
      params.push(`%${ref_no}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [shipments] = await pool.execute(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM shipments WHERE 1=1';
    const countParams = [];
    
    if (waybill_no) {
      countQuery += ' AND waybill_no LIKE ?';
      countParams.push(`%${waybill_no}%`);
    }
    
    if (ref_no) {
      countQuery += ' AND ref_no LIKE ?';
      countParams.push(`%${ref_no}%`);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: shipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  processStatusWebhook,
  getShipmentByWaybill,
  getAllShipments
};

