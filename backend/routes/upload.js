
const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');
const Busboy = require('busboy');

// Initialize storage bucket on startup
(async () => {
  try {
    await storageService.ensureBucketExists();
  } catch (error) {
    console.error('❌ Failed to initialize storage bucket:', error);
  }
})();

// Define the POST / route for file uploads to Supabase Storage
router.post('/', (req, res) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    let fileBuffer = Buffer.alloc(0);
    let fileName = '';
    let mimeType = '';
    let folder = 'uploads';

    // Handle file upload
    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType: fileMimeType } = info;
      fileName = filename;
      mimeType = fileMimeType;

      console.log(`📤 Receiving file: ${filename} (${fileMimeType})`);

      // Collect file data
      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
      });

      file.on('end', () => {
        console.log(`✅ File received: ${filename} (${fileBuffer.length} bytes)`);
      });
    });

    // Handle form fields
    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'folder') {
        folder = value;
      }
    });

    // Handle completion
    busboy.on('finish', async () => {
      try {
        if (!fileBuffer.length) {
          return res.status(400).json({
            success: false,
            message: 'No file uploaded.'
          });
        }

        // Validate file
        const validation = storageService.validateFile(mimeType, fileBuffer.length);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }

        console.log(`📤 Processing upload: ${fileName} (${fileBuffer.length} bytes) to folder: ${folder}`);

        // Upload to Supabase Storage
        const uploadResult = await storageService.uploadFile(
          fileBuffer,
          fileName,
          mimeType,
          folder
        );

        res.json({
          success: true,
          message: 'File uploaded successfully to Supabase Storage',
          url: uploadResult.url,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
          path: uploadResult.path
        });

      } catch (error) {
        console.error('❌ Upload processing error:', error);
        res.status(500).json({
          success: false,
          message: 'Upload failed. Please try again.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Handle errors
    busboy.on('error', (error) => {
      console.error('❌ Busboy error:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed due to parsing error.'
      });
    });

    // Pipe request to busboy
    req.pipe(busboy);

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;