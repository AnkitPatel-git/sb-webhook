/**
 * Migration: Add all missing fields from status tracking specification
 * Adds CustomerCode, SpecialInstruction, SorryCardNumber, IDDescription, RWImageURL, and restructures call_logs
 */

module.exports = {
  up: async (db) => {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) as count 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = ?`,
          [tableName, columnName]
        );
        return rows[0].count > 0;
      } catch (e) {
        return false;
      }
    };

    // 1. Add missing fields to shipments table
    if (!(await columnExists("shipments", "customer_code"))) {
      await db.query(`
        ALTER TABLE shipments
        ADD COLUMN customer_code VARCHAR(6) AFTER weight
      `);
    }
    if (!(await columnExists("shipments", "special_instruction"))) {
      await db.query(`
        ALTER TABLE shipments
        ADD COLUMN special_instruction VARCHAR(50) AFTER customer_code
      `);
    }

    // 2. Add missing fields to scans table
    if (!(await columnExists("scans", "sorry_card_number"))) {
      await db.query(`
        ALTER TABLE scans
        ADD COLUMN sorry_card_number VARCHAR(25) AFTER secure_code
      `);
    }
    if (!(await columnExists("scans", "id_description"))) {
      await db.query(`
        ALTER TABLE scans
        ADD COLUMN id_description VARCHAR(30) AFTER id_number
      `);
    }

    // 3. Add missing field to delivery_details table
    if (!(await columnExists("delivery_details", "id_description"))) {
      await db.query(`
        ALTER TABLE delivery_details
        ADD COLUMN id_description VARCHAR(30) AFTER id_number
      `);
    }

    // 4. Add missing field to reweigh table
    if (!(await columnExists("reweigh", "rw_image_url"))) {
      await db.query(`
        ALTER TABLE reweigh
        ADD COLUMN rw_image_url VARCHAR(100) AFTER rw_vol_weight
      `);
    }

    // 5. Restructure call_logs table to store individual fields
    // Check if call_logs table exists and has old structure (log_data column)
    const callLogsHasOldStructure = await columnExists("call_logs", "log_data");

    if (callLogsHasOldStructure) {
      // Backup existing data if any
      try {
        const [rows] = await db.query(
          `SELECT COUNT(*) as count FROM call_logs`
        );
        if (rows[0].count > 0) {
          await db.query(`
            CREATE TABLE IF NOT EXISTS call_logs_backup AS SELECT * FROM call_logs
          `);
        }
      } catch (e) {
        // Table might be empty or not exist, continue
      }

      // Drop and recreate call_logs with proper structure
      await db.query(`DROP TABLE IF EXISTS call_logs`);
    }

    // Create call_logs table with new structure (only if it doesn't exist)
    const callLogsExists = await columnExists("call_logs", "id");
    if (!callLogsExists) {
      await db.query(`
        CREATE TABLE call_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          shipment_id INT NOT NULL,
          message VARCHAR(300),
          log_date DATE,
          log_time VARCHAR(4),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
          INDEX idx_shipment_id (shipment_id),
          INDEX idx_log_date (log_date),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    // 6. Create reweigh_images table for RWImage data
    await db.query(`
      CREATE TABLE IF NOT EXISTS reweigh_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        mps_number VARCHAR(16),
        rw_image_url VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_mps_number (mps_number),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log("✅ Added all missing fields and tables");
  },

  down: async (db) => {
    // Drop new table
    await db.query("DROP TABLE IF EXISTS reweigh_images");

    // Restore call_logs to previous structure
    await db.query(`DROP TABLE IF EXISTS call_logs`);
    await db.query(`
      CREATE TABLE call_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shipment_id INT NOT NULL,
        log_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
        INDEX idx_shipment_id (shipment_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Restore data from backup if exists
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM call_logs_backup`
      );
      if (rows[0].count > 0) {
        await db.query(`
          INSERT INTO call_logs (shipment_id, log_data, created_at)
          SELECT shipment_id, log_data, created_at FROM call_logs_backup
        `);
      }
    } catch (e) {
      // Backup table might not exist, continue
    }

    await db.query("DROP TABLE IF EXISTS call_logs_backup");

    // Remove added columns (MySQL doesn't support IF EXISTS for DROP COLUMN, so we'll use a safer approach)
    try {
      await db.query(`ALTER TABLE reweigh DROP COLUMN rw_image_url`);
    } catch (e) {
      console.log("Column rw_image_url may not exist");
    }

    try {
      await db.query(`ALTER TABLE delivery_details DROP COLUMN id_description`);
    } catch (e) {
      console.log("Column id_description may not exist in delivery_details");
    }

    try {
      await db.query(`ALTER TABLE scans DROP COLUMN id_description`);
    } catch (e) {
      console.log("Column id_description may not exist in scans");
    }

    try {
      await db.query(`ALTER TABLE scans DROP COLUMN sorry_card_number`);
    } catch (e) {
      console.log("Column sorry_card_number may not exist");
    }

    try {
      await db.query(`ALTER TABLE shipments DROP COLUMN special_instruction`);
    } catch (e) {
      console.log("Column special_instruction may not exist");
    }

    try {
      await db.query(`ALTER TABLE shipments DROP COLUMN customer_code`);
    } catch (e) {
      console.log("Column customer_code may not exist");
    }

    console.log("✅ Rolled back all field additions");
  },
};
