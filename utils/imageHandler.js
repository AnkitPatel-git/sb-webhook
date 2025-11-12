const fs = require("fs");
const path = require("path");

/**
 * Save base64 image to file system
 * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param {string} waybillNo - Waybill number for folder organization
 * @param {string} imageType - Type of image (qc, pod, dc, id)
 * @param {number} index - Index for multiple images
 * @returns {string|null} - File path relative to uploads directory, or null if failed
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

    // Create directory structure: uploads/{waybillNo}/{imageType}/
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const waybillDir = path.join(uploadsDir, waybillNo);
    const typeDir = path.join(waybillDir, imageType);

    // Create directories if they don't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(waybillDir)) {
      fs.mkdirSync(waybillDir, { recursive: true });
    }
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    // Generate filename: {timestamp}_{index}.{extension}
    const timestamp = Date.now();
    const filename = `${timestamp}_${index}.${extension}`;
    const filePath = path.join(typeDir, filename);
    const relativePath = path.join("uploads", waybillNo, imageType, filename);

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
 * @param {Array} base64Array - Array of base64 encoded images
 * @param {string} waybillNo - Waybill number
 * @param {string} imageType - Type of image
 * @returns {Array} - Array of file paths
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
