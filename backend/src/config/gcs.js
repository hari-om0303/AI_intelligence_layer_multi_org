const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

let storage = null;
const bucketName = process.env.GCS_BUCKET_NAME;

// Initialize Google Cloud Storage client in production if configured
if (process.env.GCP_PROJECT_ID && bucketName) {
  try {
    storage = new Storage();
    console.log(`[Storage] GCS client initialized for bucket: ${bucketName}`);
  } catch (err) {
    console.error('[Storage] Error initializing GCS client:', err.message);
  }
}

/**
 * Uploads a file buffer to Google Cloud Storage.
 * Falls back to local directory serving if GCS is not configured or errors.
 * 
 * @param {Buffer} fileBuffer - The file buffer from multer.
 * @param {string} originalName - Original filename.
 * @param {string} mimeType - The mime type of the file.
 * @returns {Promise<{ url: string, name: string }>} Resolves with public file URL and original filename.
 */
const uploadFileStream = async (fileBuffer, originalName, mimeType) => {
  const fileExtension = path.extname(originalName);
  const baseName = path.basename(originalName, fileExtension).replace(/[^a-zA-Z0-9]/g, '_');
  const uniqueName = `${Date.now()}-${baseName}${fileExtension}`;

  // If storage client or bucket is not configured, write to local uploads folder
  if (!storage || !bucketName) {
    console.log('[Storage] GCS not configured. Falling back to local filesystem storage.');
    
    const uploadsDir = path.join(__dirname, '../public/uploads');
    
    // Ensure the folder exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const localPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(localPath, fileBuffer);

    // Return the relative URL served by Express static routing
    const localUrl = `/uploads/${uniqueName}`;
    return {
      url: localUrl,
      name: originalName
    };
  }

  // Upload to Google Cloud Storage
  try {
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(uniqueName);

    await new Promise((resolve, reject) => {
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: { contentType: mimeType }
      });

      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', () => resolve());
      blobStream.end(fileBuffer);
    });

    const gcsUrl = `https://storage.googleapis.com/${bucketName}/${uniqueName}`;
    console.log(`[Storage] Successfully uploaded ${originalName} to GCS: ${gcsUrl}`);
    
    return {
      url: gcsUrl,
      name: originalName
    };
  } catch (error) {
    console.error('[Storage] GCS Upload failed, executing local emergency fallback:', error.message);
    
    // Emergency local fallback if GCS upload crashes
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(localPath, fileBuffer);
    
    return {
      url: `/uploads/${uniqueName}`,
      name: originalName
    };
  }
};

module.exports = {
  uploadFileStream
};
