// src/config/multer.config.ts
import multer from 'multer';
import { BadRequestError } from '../utils/errors/api-error';

// Constants
const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Error messages
export const UPLOAD_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: `File exceeds size limit (${MAX_FILE_SIZE_MB}MB)`,
  LIMIT_UNEXPECTED_FILE: 'Invalid file field name',
  INVALID_FILE_TYPE: 'Only image files are allowed'
};

// Helper to handle multer errors
export const handleMulterError = (err: any): BadRequestError => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return new BadRequestError(UPLOAD_ERROR_MESSAGES.LIMIT_FILE_SIZE, [err.code]);
      case 'LIMIT_UNEXPECTED_FILE':
        return new BadRequestError(UPLOAD_ERROR_MESSAGES.LIMIT_UNEXPECTED_FILE, [err.code]);
      default:
        return new BadRequestError(`Error processing file: ${err.message}`, [err.code]);
    }
  }
  
  if (err.message === UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE) {
    return new BadRequestError(err.message, ['INVALID_FILE_TYPE']);
  }
  
  return new BadRequestError('Error processing file', [err.message]);
};

// Image upload configuration
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error(UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE));
    }
  }
});

// Helper function to create file object from request
export const createFileObjectFromRequest = (file: Express.Multer.File) => ({
  buffer: file.buffer,
  mimeType: file.mimetype,
  fileName: file.originalname
});