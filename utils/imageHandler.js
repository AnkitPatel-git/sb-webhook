const fs = require("fs");
const path = require("path");

/**
 * Save base64 image to file system
 * Images are stored in storage/{year}/{month}/ structure
 * Only the URL/path is stored in the database
 *
 * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param {string} waybillNo - Waybill number for filename prefix
 * @param {string} imageType - Type of image (qc, pod, dc, id, signature)
 * @param {number} index - Index for multiple images
 * @returns {string|null} - File path relative to storage directory, or null if failed
 */
function saveBase64Image(base64Data, waybillNo, imageType, index = 0) {
  try {
    if (!base64Data || base64Data.trim() === "") {
      return null;
    }

    // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
    let base64String = base64Data;
    if (base64Data.includes(",")) {
      base64String = base64Data.split(",")[1];
    }

    // Determine file extension from base64 or default to jpg
    let extension = "jpg";
    if (base64Data.startsWith("data:image/")) {
      const mimeMatch = base64Data.match(/data:image\/(\w+);base64/);
      if (mimeMatch) {
        extension = mimeMatch[1];
        // Normalize extension
        if (extension === "jpeg") extension = "jpg";
      }
    }

    // Get current date for year/month folder structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 01-12

    // Create directory structure: storage/{year}/{month}/
    const storageDir = path.join(__dirname, "..", "storage");
    const yearDir = path.join(storageDir, String(year));
    const monthDir = path.join(yearDir, month);

    // Create directories if they don't exist
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir, { recursive: true });
    }

    // Generate filename: {waybillNo}_{imageType}_{timestamp}_{index}.{extension}
    const timestamp = Date.now();
    const safeWaybillNo = (waybillNo || "unknown").replace(
      /[^a-zA-Z0-9]/g,
      "_"
    );
    const filename = `${safeWaybillNo}_${imageType}_${timestamp}_${index}.${extension}`;
    const filePath = path.join(monthDir, filename);

    // Return relative path from project root: storage/{year}/{month}/{filename}
    const relativePath = path.join("storage", String(year), month, filename);

    // Decode and save base64 to file
    const buffer = Buffer.from(base64String, "base64");
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Saved image: ${relativePath}`);
    return relativePath;
  } catch (error) {
    console.error(`❌ Error saving image:`, error.message);
    return null;
  }
}

/**
 * Save multiple base64 images
 * Images are stored in storage/{year}/{month}/ structure
 *
 * @param {Array} base64Array - Array of base64 encoded images
 * @param {string} waybillNo - Waybill number for filename prefix
 * @param {string} imageType - Type of image (qc, pod, dc, id, signature)
 * @returns {Array} - Array of file paths (URLs) relative to storage directory
 */
function saveBase64Images(base64Array, waybillNo, imageType) {
  if (!Array.isArray(base64Array) || base64Array.length === 0) {
    return [];
  }

  const filePaths = [];
  base64Array.forEach((base64Data, index) => {
    const filePath = saveBase64Image(base64Data, waybillNo, imageType, index);
    if (filePath) {
      filePaths.push(filePath);
    }
  });

  return filePaths;
}

module.exports = {
  saveBase64Image,
  saveBase64Images,
};
