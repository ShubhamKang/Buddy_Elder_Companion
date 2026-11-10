// Image handling without Firebase Storage.
//
// The self-hosted backend does not (yet) expose an object-storage endpoint, so
// to keep the app fully free and dependency-light we encode images as base64
// data URLs on the client. These can be sent inline (e.g. as a profile photo
// field) or displayed directly. A future backend file-upload endpoint can
// replace readFileAsDataUrl without changing call sites that use `url`.

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const createUniqueFileName = (originalName, prefix = 'file') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = (originalName && originalName.split('.').pop()) || 'img';
  return `${prefix}_${timestamp}_${randomString}.${extension}`;
};

const validate = (file) => {
  if (!file) throw new Error('No file provided');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File size too large. Maximum size is 5MB.');
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

// Returns the same shape the previous Firebase uploader did, so callers that
// read `.url`, `.fileName`, etc. keep working. `url` is now a data URL.
export const uploadImageToStorage = async (file, folder = 'uploads', owner = null) => {
  validate(file);
  const url = await readFileAsDataUrl(file);
  return {
    url,
    fileName: createUniqueFileName(file.name, owner || 'user'),
    originalName: file.name,
    size: file.size,
    type: file.type,
  };
};

export const uploadMultipleFiles = async (files, folder = 'uploads', owner = null) => {
  const results = await Promise.allSettled(
    Array.from(files).map((file) => uploadImageToStorage(file, folder, owner))
  );
  const successful = [];
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({ file: files[index].name, error: result.reason.message });
    }
  });
  return { successful, failed };
};

export const createFileMetadata = (file) => ({
  name: file.name,
  size: file.size,
  type: file.type,
  lastModified: file.lastModified,
  isLocal: true,
});
