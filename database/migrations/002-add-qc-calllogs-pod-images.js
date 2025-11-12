/**
 * Migration: Add QCFailed, CallLogs, and PODDCImages support
 * Adds tables for QC failures, call logs, and POD/DC images
 */

module.exports = {
  up: async (db) => {
    // QC Failed table
    await db.query(`
      CREATE TABLE IF NOT EXISTS qc_failed (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        qc_type VARCHAR(1),
        qc_reason VARCHAR(255),
        pictures JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Call Logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS call_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        log_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // POD/DC Images table
    await db.query(`
      CREATE TABLE IF NOT EXISTS pod_dc_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        pod_images JSON,
        dc_images JSON,
        image_sequence VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ Added QCFailed, CallLogs, and PODDCImages tables");
  },

  down: async (db) => {
    await db.query("DROP TABLE IF EXISTS pod_dc_images");
    await db.query("DROP TABLE IF EXISTS call_logs");
    await db.query("DROP TABLE IF EXISTS qc_failed");

    console.log("✅ Removed QCFailed, CallLogs, and PODDCImages tables");
  },
};
