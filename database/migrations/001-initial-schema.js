/**
 * Initial database schema migration
 * Creates all tables for Blue Dart webhook system
 */

module.exports = {
  up: async (db) => {
    // Create database if it doesn't exist
    await db.query('CREATE DATABASE IF NOT EXISTS bluedart_db');
    await db.query('USE bluedart_db');

    // Shipments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id VARCHAR(10),
        receiver_id VARCHAR(50),
        waybill_no VARCHAR(20) UNIQUE,
        ref_no VARCHAR(50),
        prod_code VARCHAR(5),
        sub_product_code VARCHAR(5),
        feature VARCHAR(5),
        origin VARCHAR(50),
        origin_area_code VARCHAR(5),
        destination VARCHAR(50),
        destination_area_code VARCHAR(5),
        pickup_date DATE,
        pickup_time VARCHAR(10),
        expected_delivery_date DATE,
        shipment_mode VARCHAR(5),
        weight DECIMAL(7,2),
        dynamic_expected_delivery_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_waybill_no (waybill_no),
        INDEX idx_ref_no (ref_no),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Scans table
    await db.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        scan_type VARCHAR(5),
        scan_group_type VARCHAR(5),
        scan_code VARCHAR(10),
        scan VARCHAR(255),
        scan_date DATE,
        scan_time VARCHAR(10),
        scanned_location_code VARCHAR(10),
        scanned_location VARCHAR(50),
        scanned_location_city VARCHAR(50),
        scanned_location_state_code VARCHAR(10),
        comments VARCHAR(255),
        status_timezone VARCHAR(10),
        status_latitude VARCHAR(25),
        status_longitude VARCHAR(25),
        reached_destination_location CHAR(1),
        secure_code VARCHAR(20),
        received_by VARCHAR(50),
        relation VARCHAR(50),
        id_type VARCHAR(20),
        id_number VARCHAR(50),
        qc_type VARCHAR(1),
        qc_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_scan_date (scan_date),
        INDEX idx_scan_code (scan_code),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Delivery details table
    await db.query(`
      CREATE TABLE IF NOT EXISTS delivery_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        received_by VARCHAR(50),
        relation VARCHAR(50),
        id_type VARCHAR(20),
        id_number VARCHAR(50),
        security_code_delivery VARCHAR(50),
        signature TEXT,
        id_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Reweigh table
    await db.query(`
      CREATE TABLE IF NOT EXISTS reweigh (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        mps_number VARCHAR(50),
        rw_actual_weight DECIMAL(7,2),
        rw_length DECIMAL(7,2),
        rw_breadth DECIMAL(7,2),
        rw_height DECIMAL(7,2),
        rw_vol_weight DECIMAL(7,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Webhook audit log table
    await db.query(`
      CREATE TABLE IF NOT EXISTS webhook_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        waybill_no VARCHAR(20),
        payload JSON,
        response_status INT,
        response_message TEXT,
        error_message TEXT,
        client_ip VARCHAR(45),
        client_id VARCHAR(100),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_waybill_no (waybill_no),
        INDEX idx_processed_at (processed_at),
        INDEX idx_response_status (response_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Initial schema migration completed');
  },

  down: async (db) => {
    await db.query('USE bluedart_db');
    
    await db.query('DROP TABLE IF EXISTS webhook_audit_log');
    await db.query('DROP TABLE IF EXISTS reweigh');
    await db.query('DROP TABLE IF EXISTS delivery_details');
    await db.query('DROP TABLE IF EXISTS scans');
    await db.query('DROP TABLE IF EXISTS shipments');

    console.log('✅ Initial schema rollback completed');
  }
};


