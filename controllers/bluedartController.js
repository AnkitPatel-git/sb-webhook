const pool = require("../config/database");
const { saveBase64Images, saveBase64Image } = require("../utils/imageHandler");
const { logRequestResponse } = require("../utils/requestLogger");

/**
 * Validate date format (dd-mm-yyyy) and check if it's a valid date
 * @param {string} dateString - Date string in dd-mm-yyyy format
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidDate(dateString) {
  if (!dateString || dateString.trim() === "") {
    return true; // Empty dates are allowed (will be null)
  }

  // Check format: dd-mm-yyyy
  const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(dateRegex);

  if (!match) {
    return false;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Check for invalid dates like 30-12-0000
  if (year < 1900 || year > 2100) {
    return false;
  }

  // Create date object and validate
  const date = new Date(year, month - 1, day);

  // Check if date is valid and matches input
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Validate payload dates
 * @param {Object} shipment - Shipment object
 * @returns {string|null} - Error message if invalid, null if valid
 */
function validateShipmentDates(shipment) {
  if (shipment.PickUpDate && !isValidDate(shipment.PickUpDate)) {
    return `Invalid PickUpDate: ${shipment.PickUpDate}`;
  }
  if (
    shipment.ExpectedDeliveryDate &&
    !isValidDate(shipment.ExpectedDeliveryDate)
  ) {
    return `Invalid ExpectedDeliveryDate: ${shipment.ExpectedDeliveryDate}`;
  }
  if (
    shipment.DynamicExpectedDeliveryDate &&
    !isValidDate(shipment.DynamicExpectedDeliveryDate)
  ) {
    return `Invalid DynamicExpectedDeliveryDate: ${shipment.DynamicExpectedDeliveryDate}`;
  }
  return null;
}

/**
 * Validate field lengths based on database schema
 * @param {Object} shipment - Shipment object
 * @returns {string|null} - Error message if invalid, null if valid
 */
function validateFieldLengths(shipment) {
  // Shipments table field length constraints
  const fieldLimits = {
    SenderID: 10,
    ReceiverID: 50,
    WaybillNo: 20,
    RefNo: 50,
    Prodcode: 5,
    SubProductCode: 5,
    Feature: 5,
    Origin: 50,
    OriginAreaCode: 5,
    Destination: 50,
    DestinationAreaCode: 5,
    PickUpTime: 10,
    ShipmentMode: 5,
    CustomerCode: 6,
    SpecialInstruction: 50,
  };

  for (const [field, maxLength] of Object.entries(fieldLimits)) {
    const value = shipment[field];
    if (value && typeof value === "string" && value.length > maxLength) {
      return `${field} exceeds maximum length of ${maxLength} characters (received ${value.length})`;
    }
  }

  return null;
}

/**
 * Blue Dart Webhook Status Endpoint
 * Processes incoming shipment tracking updates from Blue Dart Push API
 */
const processStatusWebhook = async (req, res) => {
  const startTime = Date.now();
  let processedShipments = [];
  let errors = [];

  // Set timeout to prevent hanging requests (30 seconds)
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: "Request timeout",
      });
    }
  });

  try {
    const { statustracking } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const clientId = req.clientId || req.headers["client-id"];

    console.log(
      `📥 Received webhook: ${statustracking?.length || 0} shipment(s)`
    );

    // Validate payload structure
    if (!statustracking || !Array.isArray(statustracking)) {
      const errorResponse = {
        success: false,
        message: "incorrect payload",
      };

      // Log invalid payload (logging middleware will also log this)
      await logRequestResponse(
        req,
        res,
        "/api/bluedart/status",
        errorResponse,
        400
      );

      return res.status(400).json(errorResponse);
    }

    // Validate all shipments before processing
    const validationErrors = [];
    for (const entry of statustracking) {
      const shipment = entry.Shipment;

      if (!shipment || !shipment.WaybillNo) {
        validationErrors.push({
          waybill_no: shipment?.WaybillNo || "unknown",
          error: "Missing Shipment or WaybillNo",
        });
        continue;
      }

      // Validate dates
      const dateError = validateShipmentDates(shipment);
      if (dateError) {
        validationErrors.push({
          waybill_no: shipment.WaybillNo,
          error: dateError,
        });
      }

      // Validate field lengths
      const lengthError = validateFieldLengths(shipment);
      if (lengthError) {
        validationErrors.push({
          waybill_no: shipment.WaybillNo,
          error: lengthError,
        });
      }

      // Validate scan dates if present
      if (shipment.Scans && shipment.Scans.ScanDetail) {
        const scanDetails = Array.isArray(shipment.Scans.ScanDetail)
          ? shipment.Scans.ScanDetail
          : [shipment.Scans.ScanDetail];

        for (const scan of scanDetails) {
          if (scan.ScanDate && !isValidDate(scan.ScanDate)) {
            validationErrors.push({
              waybill_no: shipment.WaybillNo,
              error: `Invalid ScanDate: ${scan.ScanDate}`,
            });
          }
        }
      }

      // Validate Lite format scan date
      if (shipment.ScanDate && !isValidDate(shipment.ScanDate)) {
        validationErrors.push({
          waybill_no: shipment.WaybillNo,
          error: `Invalid ScanDate: ${shipment.ScanDate}`,
        });
      }
    }

    // If validation errors found, return error response
    if (validationErrors.length > 0) {
      const errorResponse = {
        success: false,
        message: "incorrect payload",
        errors: validationErrors,
      };

      await logRequestResponse(
        req,
        res,
        "/api/bluedart/status",
        errorResponse,
        400
      );

      return res.status(400).json(errorResponse);
    }

    // Process each shipment in the array
    for (const entry of statustracking) {
      try {
        const shipment = entry.Shipment;

        if (!shipment || !shipment.WaybillNo) {
          errors.push({ error: "Missing Shipment or WaybillNo", entry });
          continue;
        }

        // 1️⃣ Insert or update shipment
        const [existing] = await pool.execute(
          "SELECT id FROM shipments WHERE waybill_no = ?",
          [shipment.WaybillNo]
        );

        let shipmentId;

        if (existing.length === 0) {
          // Insert new shipment
          const [result] = await pool.execute(
            `INSERT INTO shipments (
              sender_id, receiver_id, waybill_no, ref_no, prod_code, sub_product_code,
              feature, origin, origin_area_code, destination, destination_area_code,
              pickup_date, pickup_time, expected_delivery_date, shipment_mode, weight, 
              dynamic_expected_delivery_date, customer_code, special_instruction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
              STR_TO_DATE(?, '%d-%m-%Y'), ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, ?)`,
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
              shipment.CustomerCode || null,
              shipment.SpecialInstruction || null,
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
              customer_code = COALESCE(?, customer_code),
              special_instruction = COALESCE(?, special_instruction),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              shipment.ExpectedDeliveryDate || null,
              shipment.DynamicExpectedDeliveryDate || null,
              shipment.CustomerCode || null,
              shipment.SpecialInstruction || null,
              shipmentId,
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
            SorryCardNumber: shipment.SorryCardNumber || null,
            ReceivedBy: null,
            Relation: null,
            IDType: null,
            IDNumber: null,
            IDDescription: null,
            QCType: null,
            QCReason: null,
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
              scan.ScanTime || null,
            ]
          );

          if (existingScan.length === 0) {
            await pool.execute(
              `INSERT INTO scans (
                shipment_id, scan_type, scan_group_type, scan_code, scan, scan_date,
                scan_time, scanned_location_code, scanned_location, scanned_location_city, 
                scanned_location_state_code, comments, status_timezone, status_latitude, 
                status_longitude, reached_destination_location, secure_code, sorry_card_number,
                received_by, relation, id_type, id_number, id_description, qc_type, qc_reason
              ) VALUES (?, ?, ?, ?, ?, STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                scan.SorryCardNumber || null,
                scan.ReceivedBy || null,
                scan.Relation || null,
                scan.IDType || null,
                scan.IDNumber || null,
                scan.IDDescription || null,
                scan.QCType || null,
                scan.QCReason || null,
              ]
            );
          }
        }

        // 3️⃣ Insert delivery details (Push API Plus only)
        if (shipment.Scans && shipment.Scans.DeliveryDetails) {
          const deliveryDetails = shipment.Scans.DeliveryDetails;

          // Save ID Image as file if provided (base64)
          let idImagePath = null;
          if (
            deliveryDetails.IDImage &&
            deliveryDetails.IDImage.trim() !== ""
          ) {
            idImagePath = saveBase64Image(
              deliveryDetails.IDImage,
              shipment.WaybillNo,
              "id",
              0
            );
          }

          // Save Signature as file if provided (base64)
          let signaturePath = null;
          if (
            deliveryDetails.Signature &&
            deliveryDetails.Signature.trim() !== ""
          ) {
            signaturePath = saveBase64Image(
              deliveryDetails.Signature,
              shipment.WaybillNo,
              "signature",
              0
            );
          }

          // Check if delivery details already exist
          const [existingDelivery] = await pool.execute(
            "SELECT id FROM delivery_details WHERE shipment_id = ?",
            [shipmentId]
          );

          if (existingDelivery.length === 0) {
            await pool.execute(
              `INSERT INTO delivery_details (
                shipment_id, received_by, relation, id_type, id_number, id_description,
                security_code_delivery, signature, id_image
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shipmentId,
                deliveryDetails.ReceivedBy || null,
                deliveryDetails.Relation || null,
                deliveryDetails.IDType || null,
                deliveryDetails.IDNumber || null,
                deliveryDetails.IDDescription || null,
                deliveryDetails.SecurityCodeDelivery || null,
                signaturePath || null,
                idImagePath || null,
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
                id_description = COALESCE(?, id_description),
                security_code_delivery = COALESCE(?, security_code_delivery),
                signature = COALESCE(?, signature),
                id_image = COALESCE(?, id_image)
              WHERE shipment_id = ?`,
              [
                deliveryDetails.ReceivedBy || null,
                deliveryDetails.Relation || null,
                deliveryDetails.IDType || null,
                deliveryDetails.IDNumber || null,
                deliveryDetails.IDDescription || null,
                deliveryDetails.SecurityCodeDelivery || null,
                signaturePath || null,
                idImagePath || null,
                shipmentId,
              ]
            );
          }
        }

        // 4️⃣ Insert reweigh information (Push API Plus only)
        // Handle both object and array formats
        if (shipment.Scans && shipment.Scans.Reweigh) {
          const reweighData = shipment.Scans.Reweigh;
          // Handle both array and object formats
          const reweighArray = Array.isArray(reweighData)
            ? reweighData
            : [reweighData];

          for (const reweigh of reweighArray) {
            if (
              !reweigh ||
              (typeof reweigh === "object" && Object.keys(reweigh).length === 0)
            ) {
              continue; // Skip empty objects/arrays
            }

            // Check if reweigh already exists
            const [existingReweigh] = await pool.execute(
              "SELECT id FROM reweigh WHERE shipment_id = ? AND mps_number = ?",
              [shipmentId, reweigh.MPSNumber || ""]
            );

            if (existingReweigh.length === 0) {
              await pool.execute(
                `INSERT INTO reweigh (
                  shipment_id, mps_number, rw_actual_weight, rw_length, 
                  rw_breadth, rw_height, rw_vol_weight, rw_image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  shipmentId,
                  reweigh.MPSNumber || null,
                  reweigh.RWActualWeight && reweigh.RWActualWeight !== ""
                    ? parseFloat(reweigh.RWActualWeight)
                    : null,
                  reweigh.RWLength && reweigh.RWLength !== ""
                    ? parseFloat(reweigh.RWLength)
                    : null,
                  reweigh.RWBreadth && reweigh.RWBreadth !== ""
                    ? parseFloat(reweigh.RWBreadth)
                    : null,
                  reweigh.RWHeight && reweigh.RWHeight !== ""
                    ? parseFloat(reweigh.RWHeight)
                    : null,
                  reweigh.RWVolWeight && reweigh.RWVolWeight !== ""
                    ? parseFloat(reweigh.RWVolWeight)
                    : null,
                  reweigh.RWImageURL || null,
                ]
              );
            } else {
              // Update existing reweigh
              await pool.execute(
                `UPDATE reweigh SET
                  rw_actual_weight = COALESCE(?, rw_actual_weight),
                  rw_length = COALESCE(?, rw_length),
                  rw_breadth = COALESCE(?, rw_breadth),
                  rw_height = COALESCE(?, rw_height),
                  rw_vol_weight = COALESCE(?, rw_vol_weight),
                  rw_image_url = COALESCE(?, rw_image_url)
                WHERE shipment_id = ? AND mps_number = ?`,
                [
                  reweigh.RWActualWeight && reweigh.RWActualWeight !== ""
                    ? parseFloat(reweigh.RWActualWeight)
                    : null,
                  reweigh.RWLength && reweigh.RWLength !== ""
                    ? parseFloat(reweigh.RWLength)
                    : null,
                  reweigh.RWBreadth && reweigh.RWBreadth !== ""
                    ? parseFloat(reweigh.RWBreadth)
                    : null,
                  reweigh.RWHeight && reweigh.RWHeight !== ""
                    ? parseFloat(reweigh.RWHeight)
                    : null,
                  reweigh.RWVolWeight && reweigh.RWVolWeight !== ""
                    ? parseFloat(reweigh.RWVolWeight)
                    : null,
                  reweigh.RWImageURL || null,
                  shipmentId,
                  reweigh.MPSNumber || "",
                ]
              );
            }
          }
        }

        // 5️⃣ Insert QC Failed information (Push API Plus/Advance)
        // Handle both QCFailed and QC formats
        const qcData = shipment.Scans?.QCFailed || shipment.Scans?.QC;
        if (qcData) {
          // Save QC pictures as files if provided
          let picturePaths = [];
          if (
            qcData.Pictures &&
            Array.isArray(qcData.Pictures) &&
            qcData.Pictures.length > 0
          ) {
            picturePaths = saveBase64Images(
              qcData.Pictures,
              shipment.WaybillNo,
              "qc"
            );
          }

          // Extract QC type and reason
          // QCFailed format: Type, Reason
          // QC format: Result (P/F), Reason from Questions
          let qcType = qcData.Type || null;
          let qcReason = qcData.Reason || null;

          // If QC format, extract from Result field
          if (!qcType && qcData.Result) {
            qcType = qcData.Result; // P or F
          }

          // If no reason in QC format, we can store Remarks or Questions summary
          if (!qcReason && qcData.Remarks) {
            qcReason = qcData.Remarks;
          }

          // Check if QC failed already exists
          const [existingQC] = await pool.execute(
            "SELECT id FROM qc_failed WHERE shipment_id = ?",
            [shipmentId]
          );

          if (existingQC.length === 0) {
            await pool.execute(
              `INSERT INTO qc_failed (
                shipment_id, qc_type, qc_reason, pictures
              ) VALUES (?, ?, ?, ?)`,
              [
                shipmentId,
                qcType,
                qcReason,
                picturePaths.length > 0 ? JSON.stringify(picturePaths) : null,
              ]
            );
          } else {
            // Update existing QC failed
            await pool.execute(
              `UPDATE qc_failed SET
                qc_type = COALESCE(?, qc_type),
                qc_reason = COALESCE(?, qc_reason),
                pictures = COALESCE(?, pictures)
              WHERE shipment_id = ?`,
              [
                qcType,
                qcReason,
                picturePaths.length > 0 ? JSON.stringify(picturePaths) : null,
                shipmentId,
              ]
            );
          }
        }

        // 6️⃣ Insert Call Logs (Push API Plus)
        // Handle both object and array formats
        if (shipment.Scans && shipment.Scans.CallLogs) {
          let callLogsToProcess = [];

          // If CallLogs is an object (single call log)
          if (!Array.isArray(shipment.Scans.CallLogs)) {
            callLogsToProcess = [shipment.Scans.CallLogs];
          } else if (shipment.Scans.CallLogs.length > 0) {
            // If CallLogs is an array
            callLogsToProcess = shipment.Scans.CallLogs;
          }

          // Process each call log
          for (const callLog of callLogsToProcess) {
            if (
              !callLog ||
              (typeof callLog === "object" && Object.keys(callLog).length === 0)
            ) {
              continue; // Skip empty objects
            }

            // Handle different date formats
            let logDate = callLog.LogDate || null;
            let dateFormat = "%d-%m-%Y"; // Default format

            // If date is in YYYYMMDD format (e.g., "20251118"), convert to dd-mm-yyyy
            if (logDate && /^\d{8}$/.test(logDate)) {
              const year = logDate.substring(0, 4);
              const month = logDate.substring(4, 6);
              const day = logDate.substring(6, 8);
              logDate = `${day}-${month}-${year}`;
            }

            // Check if call log already exists to avoid duplicates
            const [existingCallLog] = await pool.execute(
              `SELECT id FROM call_logs 
               WHERE shipment_id = ? AND log_date = STR_TO_DATE(?, ?) AND log_time = ? AND message = ?`,
              [
                shipmentId,
                logDate,
                dateFormat,
                callLog.LogTime || null,
                callLog.Message || null,
              ]
            );

            if (existingCallLog.length === 0) {
              await pool.execute(
                `INSERT INTO call_logs (
                  shipment_id, message, log_date, log_time
                ) VALUES (?, ?, STR_TO_DATE(?, ?), ?)`,
                [
                  shipmentId,
                  callLog.Message || null,
                  logDate,
                  dateFormat,
                  callLog.LogTime || null,
                ]
              );
            }
          }
        }

        // 7️⃣ Insert Reweigh Images (RWImage) - separate from Reweigh table
        if (shipment.Scans && shipment.Scans.RWImage) {
          const rwImageData = shipment.Scans.RWImage;
          // Handle both array and object formats
          const rwImageArray = Array.isArray(rwImageData)
            ? rwImageData
            : [rwImageData];

          for (const rwImage of rwImageArray) {
            if (
              !rwImage ||
              (typeof rwImage === "object" && Object.keys(rwImage).length === 0)
            ) {
              continue; // Skip empty objects/arrays
            }

            // Check if reweigh image already exists
            const [existingRWImage] = await pool.execute(
              "SELECT id FROM reweigh_images WHERE shipment_id = ? AND mps_number = ?",
              [shipmentId, rwImage.MPSNumber || ""]
            );

            if (existingRWImage.length === 0) {
              await pool.execute(
                `INSERT INTO reweigh_images (
                  shipment_id, mps_number, rw_image_url
                ) VALUES (?, ?, ?)`,
                [
                  shipmentId,
                  rwImage.MPSNumber || null,
                  rwImage.RWImageURL || null,
                ]
              );
            } else {
              // Update existing reweigh image
              await pool.execute(
                `UPDATE reweigh_images SET
                  rw_image_url = COALESCE(?, rw_image_url)
                WHERE shipment_id = ? AND mps_number = ?`,
                [
                  rwImage.RWImageURL || null,
                  shipmentId,
                  rwImage.MPSNumber || "",
                ]
              );
            }
          }
        }

        // 8️⃣ Insert POD/DC Images (Push API Plus)
        if (shipment.Scans && shipment.Scans.PODDCImages) {
          const podDcImages = shipment.Scans.PODDCImages;

          // Save POD images as files if provided
          let podImagePaths = [];
          if (
            podDcImages.PODImage &&
            Array.isArray(podDcImages.PODImage) &&
            podDcImages.PODImage.length > 0
          ) {
            podImagePaths = saveBase64Images(
              podDcImages.PODImage,
              shipment.WaybillNo,
              "pod"
            );
          }

          // Save DC images as files if provided
          let dcImagePaths = [];
          if (
            podDcImages.DCImage &&
            Array.isArray(podDcImages.DCImage) &&
            podDcImages.DCImage.length > 0
          ) {
            dcImagePaths = saveBase64Images(
              podDcImages.DCImage,
              shipment.WaybillNo,
              "dc"
            );
          }

          // Check if POD/DC images already exist
          const [existingPODDC] = await pool.execute(
            "SELECT id FROM pod_dc_images WHERE shipment_id = ?",
            [shipmentId]
          );

          if (existingPODDC.length === 0) {
            await pool.execute(
              `INSERT INTO pod_dc_images (
                shipment_id, pod_images, dc_images, image_sequence
              ) VALUES (?, ?, ?, ?)`,
              [
                shipmentId,
                podImagePaths.length > 0 ? JSON.stringify(podImagePaths) : null,
                dcImagePaths.length > 0 ? JSON.stringify(dcImagePaths) : null,
                podDcImages.Imagesequence ||
                  podDcImages.ImageSequence ||
                  podDcImages.image_sequence ||
                  null,
              ]
            );
          } else {
            // Update existing POD/DC images
            await pool.execute(
              `UPDATE pod_dc_images SET
                pod_images = COALESCE(?, pod_images),
                dc_images = COALESCE(?, dc_images),
                image_sequence = COALESCE(?, image_sequence)
              WHERE shipment_id = ?`,
              [
                podImagePaths.length > 0 ? JSON.stringify(podImagePaths) : null,
                dcImagePaths.length > 0 ? JSON.stringify(dcImagePaths) : null,
                podDcImages.Imagesequence ||
                  podDcImages.ImageSequence ||
                  podDcImages.image_sequence ||
                  null,
                shipmentId,
              ]
            );
          }
        }

        processedShipments.push({
          waybill_no: shipment.WaybillNo,
          shipment_id: shipmentId,
          status: "processed",
        });
      } catch (entryError) {
        console.error(`❌ Error processing shipment entry:`, entryError);
        console.error(`   Waybill: ${entry.Shipment?.WaybillNo || "unknown"}`);
        console.error(`   Error details:`, {
          message: entryError.message,
          stack:
            process.env.NODE_ENV === "development"
              ? entryError.stack
              : undefined,
        });

        // Check if error is a validation/data error (date, length, constraint errors)
        // MySQL error codes: 1406 (ER_DATA_TOO_LONG), 1265 (ER_TRUNCATED_WRONG_VALUE), 1054 (ER_BAD_FIELD_ERROR)
        const isValidationError =
          (entryError.message &&
            (entryError.message.includes("Incorrect datetime value") ||
              entryError.message.includes("str_to_date") ||
              entryError.message.includes("Invalid date") ||
              entryError.message.includes("Data too long for column") ||
              entryError.message.includes("Out of range value") ||
              entryError.message.includes("Incorrect") ||
              entryError.message.includes("cannot be null") ||
              entryError.message.includes("Column") ||
              entryError.message.includes("too long"))) ||
          entryError.code === "ER_DATA_TOO_LONG" ||
          entryError.code === "ER_TRUNCATED_WRONG_VALUE" ||
          entryError.code === "ER_BAD_FIELD_ERROR" ||
          entryError.code === 1406 || // ER_DATA_TOO_LONG
          entryError.code === 1265 || // ER_TRUNCATED_WRONG_VALUE
          entryError.code === 1054; // ER_BAD_FIELD_ERROR

        if (isValidationError) {
          // Return validation error for data validation errors
          const errorResponse = {
            success: false,
            message: "incorrect payload",
            errors: [
              {
                waybill_no: entry.Shipment?.WaybillNo || "unknown",
                error: entryError.message,
              },
            ],
          };

          await logRequestResponse(
            req,
            res,
            "/api/bluedart/status",
            errorResponse,
            400
          );

          return res.status(400).json(errorResponse);
        }

        errors.push({
          waybill_no: entry.Shipment?.WaybillNo || "unknown",
          error: entryError.message,
        });
        // Continue processing other shipments even if one fails
      }
    }

    // Return success response (200 OK is critical for Blue Dart retry logic)
    // Logging will be handled by the middleware automatically
    const responseData = {
      success: true,
      message: "Webhook processed successfully",
      processed: processedShipments.length,
      shipments: processedShipments,
      ...(errors.length > 0 && { errors }),
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    console.error("   Error message:", error.message);
    console.error(
      "   Error stack:",
      process.env.NODE_ENV === "development" ? error.stack : "hidden"
    );

    // Only log if response hasn't been sent
    if (!res.headersSent) {
      // Return 500 error (Blue Dart will retry)
      // Logging will be handled by the middleware automatically
      const errorResponse = {
        success: false,
        message: "Server error processing webhook",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      };

      res.status(500).json(errorResponse);
    }
  }
};

/**
 * Log webhook audit trail
 */
const logWebhookAudit = async (
  waybillNo,
  responseStatus,
  responseMessage,
  errorMessage,
  clientIP,
  clientId,
  payload
) => {
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
        clientId,
      ]
    );
  } catch (logError) {
    console.error("Error logging webhook audit:", logError);
  }
};

/**
 * Get shipment by waybill number
 */
const getShipmentByWaybill = async (req, res) => {
  try {
    const { waybillNo } = req.params;

    const [shipments] = await pool.execute(
      "SELECT * FROM shipments WHERE waybill_no = ?",
      [waybillNo]
    );

    if (shipments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const shipment = shipments[0];

    // Get scans for this shipment
    const [scans] = await pool.execute(
      "SELECT * FROM scans WHERE shipment_id = ? ORDER BY scan_date DESC, scan_time DESC",
      [shipment.id]
    );

    // Get delivery details
    const [deliveryDetails] = await pool.execute(
      "SELECT * FROM delivery_details WHERE shipment_id = ? ORDER BY created_at DESC LIMIT 1",
      [shipment.id]
    );

    // Get reweigh information
    const [reweigh] = await pool.execute(
      "SELECT * FROM reweigh WHERE shipment_id = ? ORDER BY created_at DESC LIMIT 1",
      [shipment.id]
    );

    res.json({
      success: true,
      data: {
        ...shipment,
        scans: scans,
        delivery_details:
          deliveryDetails.length > 0 ? deliveryDetails[0] : null,
        reweigh: reweigh.length > 0 ? reweigh[0] : null,
      },
    });
  } catch (error) {
    console.error("Error fetching shipment:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shipment",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
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

    let query = "SELECT * FROM shipments WHERE 1=1";
    const params = [];

    if (waybill_no) {
      query += " AND waybill_no LIKE ?";
      params.push(`%${waybill_no}%`);
    }

    if (ref_no) {
      query += " AND ref_no LIKE ?";
      params.push(`%${ref_no}%`);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [shipments] = await pool.execute(query, params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM shipments WHERE 1=1";
    const countParams = [];

    if (waybill_no) {
      countQuery += " AND waybill_no LIKE ?";
      countParams.push(`%${waybill_no}%`);
    }

    if (ref_no) {
      countQuery += " AND ref_no LIKE ?";
      countParams.push(`%${ref_no}%`);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    const responseData = {
      success: true,
      data: shipments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching shipments:", error);
    const errorResponse = {
      success: false,
      message: "Error fetching shipments",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    };
    res.status(500).json(errorResponse);
  }
};

module.exports = {
  processStatusWebhook,
  getShipmentByWaybill,
  getAllShipments,
};
