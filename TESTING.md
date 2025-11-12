# Testing Guide

This guide explains how to test both Push API Lite and Push API Plus formats.

## Test Files

- `sample_payload_lite.json` - Push API Lite format (simpler, scan data on Shipment object)
- `sample_payload_plus.json` - Push API Plus format (detailed, with DeliveryDetails and Reweigh)

## Testing Push API Lite

### Using curl
```bash
curl -X POST http://localhost:3000/api/bluedart/status \
  -H "Content-Type: application/json" \
  -H "client-id: stagingID" \
  -H "token: your-test-token" \
  -d @sample_payload_lite.json
```

### Expected Behavior
- Creates/updates shipment record
- Inserts scan records from each entry in `statustracking` array
- Each entry with `WaybillNo`, `Scan`, `ScanCode`, etc. creates a scan record

## Testing Push API Plus

### Using curl
```bash
curl -X POST http://localhost:3000/api/bluedart/status \
  -H "Content-Type: application/json" \
  -H "client-id: stagingID" \
  -H "token: your-test-token" \
  -d @sample_payload_plus.json
```

### Expected Behavior
- Creates/updates shipment record with full details
- Inserts scan records from `Scans.ScanDetail` array
- Inserts delivery details if `DeliveryDetails` is present
- Inserts reweigh information if `Reweigh` is present

## Verify Data in Database

### Check Shipments
```sql
SELECT * FROM shipments WHERE waybill_no = '69679343790';
```

### Check Scans
```sql
SELECT * FROM scans WHERE shipment_id IN (
  SELECT id FROM shipments WHERE waybill_no = '69679343790'
) ORDER BY scan_date, scan_time;
```

### Check Delivery Details
```sql
SELECT * FROM delivery_details WHERE shipment_id IN (
  SELECT id FROM shipments WHERE waybill_no = '69679343790'
);
```

### Check Reweigh
```sql
SELECT * FROM reweigh WHERE shipment_id IN (
  SELECT id FROM shipments WHERE waybill_no = '69679343790'
);
```

## Test Scenarios

### Scenario 1: Push API Lite - Multiple Scans
The Lite format sends multiple entries in `statustracking`, each with scan data directly on the Shipment object.

**Test:** Send `sample_payload_lite.json`

**Expected:**
- 1 shipment record (waybill: 57941201614)
- 3 scan records (one for each entry)

### Scenario 2: Push API Plus - Full Details
The Plus format sends detailed shipment information with nested scan details, delivery info, and reweigh data.

**Test:** Send `sample_payload_plus.json`

**Expected:**
- 1 shipment record with all fields populated
- 1 scan record from ScanDetail array
- 1 delivery_details record
- 1 reweigh record

### Scenario 3: Duplicate Prevention
Send the same payload twice.

**Expected:**
- Shipment updated (not duplicated)
- Scans not duplicated (checked by scan_code, scan_date, scan_time)
- Delivery details updated (not duplicated)
- Reweigh updated (not duplicated)

### Scenario 4: Mixed Format Handling
The controller automatically detects which format is being used:
- If `Shipment.Scan` or `Shipment.ScanCode` exists → Lite format
- If `Shipment.Scans.ScanDetail` exists → Plus format
- Both can be processed in the same request

## API Response

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "processed": 1,
  "shipments": [
    {
      "waybill_no": "69679343790",
      "shipment_id": 1,
      "status": "processed"
    }
  ]
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid payload: statustracking array is required"
}
```

## Query Endpoints

### Get Shipment with All Details
```bash
curl http://localhost:3000/api/bluedart/shipments/69679343790 \
  -H "client-id: stagingID" \
  -H "token: your-test-token"
```

**Response includes:**
- Shipment details
- All scans
- Delivery details (if available)
- Reweigh information (if available)

## Troubleshooting

### No scans inserted
- Check if scan data exists in payload
- Verify date format is DD-MM-YYYY
- Check database logs for errors

### Duplicate scans
- The system prevents duplicates based on: `shipment_id`, `scan_code`, `scan_date`, `scan_time`
- If duplicates appear, check these fields match

### Missing delivery details
- Only Push API Plus includes DeliveryDetails
- Check if `Scans.DeliveryDetails` exists in payload

### Date parsing errors
- Ensure dates are in DD-MM-YYYY format
- Empty dates are handled as NULL

