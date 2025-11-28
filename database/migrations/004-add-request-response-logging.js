/**
 * Migration: Add request_data and response_data columns for detailed logging
 * Stores full request and response JSON with sanitized images (only filenames)
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

    // Add request_data column to webhook_audit_log
    if (!(await columnExists("webhook_audit_log", "request_data"))) {
      await db.query(`
        ALTER TABLE webhook_audit_log
        ADD COLUMN request_data JSON AFTER payload
      `);
    }

    // Add response_data column to webhook_audit_log
    if (!(await columnExists("webhook_audit_log", "response_data"))) {
      await db.query(`
        ALTER TABLE webhook_audit_log
        ADD COLUMN response_data JSON AFTER request_data
      `);
    }

    // Add api_endpoint column to webhook_audit_log
    if (!(await columnExists("webhook_audit_log", "api_endpoint"))) {
      await db.query(`
        ALTER TABLE webhook_audit_log
        ADD COLUMN api_endpoint VARCHAR(255) AFTER client_id
      `);
    }

    // Add headers column to webhook_audit_log
    if (!(await columnExists("webhook_audit_log", "headers"))) {
      await db.query(`
        ALTER TABLE webhook_audit_log
        ADD COLUMN headers JSON AFTER api_endpoint
      `);
    }

    console.log("✅ Added request/response logging columns");
  },

  down: async (db) => {
    // Remove added columns
    try {
      await db.query(`ALTER TABLE webhook_audit_log DROP COLUMN headers`);
    } catch (e) {
      console.log("Column headers may not exist");
    }

    try {
      await db.query(`ALTER TABLE webhook_audit_log DROP COLUMN api_endpoint`);
    } catch (e) {
      console.log("Column api_endpoint may not exist");
    }

    try {
      await db.query(`ALTER TABLE webhook_audit_log DROP COLUMN response_data`);
    } catch (e) {
      console.log("Column response_data may not exist");
    }

    try {
      await db.query(`ALTER TABLE webhook_audit_log DROP COLUMN request_data`);
    } catch (e) {
      console.log("Column request_data may not exist");
    }

    console.log("✅ Rolled back request/response logging columns");
  },
};

