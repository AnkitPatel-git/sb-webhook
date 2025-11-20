/**
 * Migration: Add headers JSON column to webhook_audit_log table
 * Stores all request headers as JSON
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

    // Add headers column to webhook_audit_log
    if (!(await columnExists("webhook_audit_log", "headers"))) {
      await db.query(`
        ALTER TABLE webhook_audit_log
        ADD COLUMN headers JSON AFTER api_endpoint
      `);
      console.log("✅ Added headers column to webhook_audit_log");
    } else {
      console.log("ℹ️  headers column already exists in webhook_audit_log");
    }
  },

  down: async (db) => {
    // Remove headers column
    try {
      await db.query(`ALTER TABLE webhook_audit_log DROP COLUMN headers`);
      console.log("✅ Removed headers column from webhook_audit_log");
    } catch (e) {
      console.log("ℹ️  headers column may not exist");
    }
  },
};
