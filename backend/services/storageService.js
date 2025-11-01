const { supabase } = require('../config/database');
const path = require('path');
const fs = require('fs');

class StorageService {
  constructor() {
    this.bucketName = 'nexeed-uploads'; 
  }

  /**
   * Upload file to Supabase Storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - File MIME type
   * @param {string} folder - Folder path (e.g., 'posts', 'avatars', 'banners')
   * @returns {Promise<Object>} - Upload result with public URL
   */
  async uploadFile(fileBuffer, fileName, mimeType, folder = 'uploads') {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized. Please check your configuration.');
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = path.extname(fileName);
      const baseName = path.basename(fileName, fileExtension);
      const uniqueFileName = `${timestamp}-${baseName}${fileExtension}`;
      const filePath = `${folder}/${uniqueFileName}`;

      console.log(`📤 Uploading file to Supabase Storage: ${filePath}`);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase Storage upload error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a bucket not found error
        if (error.message?.includes('Bucket not found') || error.statusCode === '404') {
          throw new Error('Storage bucket not found. Please create the "nexeed-uploads" bucket in Supabase Storage manually.');
        }
        
        // Check if it's a policy error
        if (error.message?.includes('policy') || error.statusCode === '403') {
          throw new Error('Storage access denied. Please configure RLS policies for the storage bucket.');
        }
        
        throw new Error(`Upload failed: ${error.message || 'Unknown storage error'}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      console.log(`✅ File uploaded successfully: ${publicUrl}`);

      return {
        success: true,
        url: publicUrl,
        path: filePath,
        fileName: uniqueFileName,
        originalName: fileName,
        size: fileBuffer.length,
        mimeType: mimeType
      };

    } catch (error) {
      console.error('❌ Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - File path in storage
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(filePath) {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log(`🗑️ Deleting file from Supabase Storage: ${filePath}`);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Supabase Storage delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log(`✅ File deleted successfully: ${filePath}`);
      return true;

    } catch (error) {
      console.error('❌ Storage delete error:', error);
      return false;
    }
  }

  /**
   * Get file public URL
   * @param {string} filePath - File path in storage
   * @returns {string} - Public URL
   */
  getPublicUrl(filePath) {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Check if bucket exists and create if needed
   * @returns {Promise<boolean>} - Success status
   */
  async ensureBucketExists() {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase client not initialized, skipping bucket check');
        return false;
      }

      // List buckets to check if our bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        console.error('❌ Error checking buckets:', error);
        return false;
      }

      const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        console.log(`📦 Creating Supabase Storage bucket: ${this.bucketName}`);
        
        try {
          const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            fileSizeLimit: 10485760 // 10MB
          });

          if (createError) {
            // Check if it's a row-level security policy error or bucket already exists
            const errorMessage = createError.message?.toLowerCase() || '';
            if (errorMessage.includes('row-level security') || 
                errorMessage.includes('already exists') ||
                errorMessage.includes('duplicate')) {
              console.log('ℹ️ Bucket already exists — continuing...');
            } else {
              console.error('❌ Error creating bucket:', createError);
            }
          } else {
            console.log('✅ Bucket created or already exists');
          }
        } catch (error) {
          // Handle any unexpected errors during bucket creation
          const errorMessage = error.message?.toLowerCase() || '';
          if (errorMessage.includes('row-level security') || 
              errorMessage.includes('already exists') ||
              errorMessage.includes('duplicate')) {
            console.log('ℹ️ Bucket already exists — continuing...');
          } else {
            console.error('❌ Unexpected error creating bucket:', error);
          }
        }
      } else {
        console.log('✅ Bucket created or already exists');
      }

      return true;

    } catch (error) {
      console.error('❌ Error ensuring bucket exists:', error);
      return false;
    }
  }

  /**
   * Validate file type and size
   * @param {string} mimeType - File MIME type
   * @param {number} fileSize - File size in bytes
   * @returns {Object} - Validation result
   */
  validateFile(mimeType, fileSize) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      };
    }

    if (fileSize > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 10MB.'
      };
    }

    return { valid: true };
  }
}

module.exports = new StorageService();
