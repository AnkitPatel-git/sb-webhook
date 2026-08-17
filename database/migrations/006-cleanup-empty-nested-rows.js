/**
 * Migration: Remove empty nested rows created from Blue Dart placeholder objects.
 *
 * Blue Dart Plus/Advance always sends DeliveryDetails, Reweigh, QCFailed,
 * CallLogs, RWImage, and PODDCImages — often as {} or objects with empty strings.
 * The webhook previously treated "object exists" as "has data" and inserted NULL rows.
 *
 * down() cannot restore deleted rows.
 */

async function deleteWhere(db, table, whereSql) {
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS count FROM ${table} WHERE ${whereSql}`
  );
  const count = countRows[0].count;

  if (count > 0) {
    await db.query(`DELETE FROM ${table} WHERE ${whereSql}`);
  }

  console.log(`🧹 ${table}: deleted ${count} empty row(s)`);
  return count;
}

module.exports = {
  up: async (db) => {
    await deleteWhere(
      db,
      "scans",
      `(scan_code IS NULL OR scan_code = '')
       AND (scan IS NULL OR scan = '')`
    );

    await deleteWhere(
      db,
      "delivery_details",
      `(received_by IS NULL OR received_by = '')
       AND (relation IS NULL OR relation = '')
       AND (id_type IS NULL OR id_type = '')
       AND (id_number IS NULL OR id_number = '')
       AND (id_description IS NULL OR id_description = '')
       AND (security_code_delivery IS NULL OR security_code_delivery = '')
       AND (signature IS NULL OR signature = '')
       AND (id_image IS NULL OR id_image = '')`
    );

    await deleteWhere(
      db,
      "reweigh",
      `(mps_number IS NULL OR mps_number = '')
       AND rw_actual_weight IS NULL
       AND rw_length IS NULL
       AND rw_breadth IS NULL
       AND rw_height IS NULL
       AND rw_vol_weight IS NULL
       AND (rw_image_url IS NULL OR rw_image_url = '')`
    );

    await deleteWhere(
      db,
      "qc_failed",
      `(qc_type IS NULL OR qc_type = '')
       AND (qc_reason IS NULL OR qc_reason = '')
       AND (pictures IS NULL OR JSON_LENGTH(pictures) = 0)`
    );

    await deleteWhere(
      db,
      "call_logs",
      `(message IS NULL OR message = '')
       AND log_date IS NULL
       AND (log_time IS NULL OR log_time = '')`
    );

    await deleteWhere(
      db,
      "reweigh_images",
      `(mps_number IS NULL OR mps_number = '')
       AND (rw_image_url IS NULL OR rw_image_url = '')`
    );

    await deleteWhere(
      db,
      "pod_dc_images",
      `(pod_images IS NULL OR JSON_LENGTH(pod_images) = 0)
       AND (dc_images IS NULL OR JSON_LENGTH(dc_images) = 0)
       AND (image_sequence IS NULL OR image_sequence = '')`
    );

    console.log("✅ Removed empty nested webhook rows");
  },

  down: async () => {
    console.log(
      "ℹ️  006-cleanup-empty-nested-rows cannot restore deleted rows"
    );
  },
};
