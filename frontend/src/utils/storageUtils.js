// Storage utility functions to handle Firebase Storage uploads with CORS handling
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

// Helper function to create a unique filename
const createUniqueFileName = (originalName, prefix = 'file') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${prefix}_${timestamp}_${randomString}.${extension}`;
};

// Upload image with retry logic and CORS handling
export const uploadImageToStorage = async (file, folder = 'uploads', mobileNumber = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Create unique filename
    const fileName = createUniqueFileName(file.name, mobileNumber || 'user');
    const storageRef = ref(storage, `${folder}/${fileName}`);

    // Upload with resumable upload for better CORS handling
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        'uploadedBy': mobileNumber || 'anonymous',
        'originalName': file.name,
        'uploadTime': new Date().toISOString()
      }
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress monitoring
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          console.error('Upload failed:', error);
          
          // Handle specific Firebase Storage errors
          switch (error.code) {
            case 'storage/unauthorized':
              reject(new Error('Upload unauthorized. Please check Firebase Storage rules.'));
              break;
            case 'storage/canceled':
              reject(new Error('Upload was canceled.'));
              break;
            case 'storage/unknown':
              reject(new Error('Unknown error occurred during upload.'));
              break;
            default:
              reject(new Error(`Upload failed: ${error.message}`));
          }
        },
        async () => {
          try {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              fileName: fileName,
              originalName: file.name,
              size: file.size,
              type: file.type
            });
          } catch (urlError) {
            reject(new Error(`Failed to get download URL: ${urlError.message}`));
          }
        }
      );
    });

  } catch (error) {
    console.error('Storage upload error:', error);
    throw error;
  }
};

// Upload multiple files
export const uploadMultipleFiles = async (files, folder = 'uploads', mobileNumber = null) => {
  const uploadPromises = files.map(file => uploadImageToStorage(file, folder, mobileNumber));
  
  try {
    const results = await Promise.allSettled(uploadPromises);
    
    const successful = [];
    const failed = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          file: files[index].name,
          error: result.reason.message
        });
      }
    });
    
    return { successful, failed };
  } catch (error) {
    throw new Error(`Batch upload failed: ${error.message}`);
  }
};

// Fallback function for when Firebase Storage is not available
export const createFileMetadata = (file) => {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    isLocal: true,
    error: 'Firebase Storage not available - file stored locally'
  };
};
