// This module is deprecated - local file uploads are used instead via src/lib/s3.ts
// Keeping for backward compatibility only

const uploadImage = async (file, folderPath) => {
  throw new Error('AWS S3 is not configured. Use local file uploads via src/lib/s3.ts instead.');
};

const deleteImage = async (imageUrl) => {
  throw new Error('AWS S3 is not configured. Use local file uploads via src/lib/s3.ts instead.');
};

module.exports = { uploadImage, deleteImage };
