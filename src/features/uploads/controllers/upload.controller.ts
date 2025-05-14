// src/features/uploads/controllers/upload.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticate.middleware';
import { uploadService } from '../services/upload.service';
import { BadRequestError } from '../../../utils/errors/api-error';
import { 
  imageUpload, 
  handleMulterError, 
  createFileObjectFromRequest 
} from '../../../config/multer.config';

// Export the controller with handlers
export const uploadController = {
  // Middleware to determine request type
  checkRequestType: (req: Request, res: Response, next: NextFunction): void => {
    // Check if it's a multipart request (Flutter) or UploadThing SDK request (web)
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // process with multer
      imageUpload.single('file')(req, res, (err) => {
        if (err) {
          return next(handleMulterError(err));
        }

        // Verify if there's a file after processing
        if (!req.file) {
          return next(new BadRequestError('No image file was provided', ['NO_FILE_UPLOADED']));
        }
        next();
      });
    } else {
      throw new BadRequestError('Invalid request type', ['INVALID_REQUEST_TYPE']);
    }
  },

  // Handler to process mobile client uploads
  processUpload: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        return next(new BadRequestError('No file found', ['NO_FILE_UPLOADED'])); 
      }

      const authReq = req as AuthenticatedRequest;

      // Extract additional information
      const userId = req.body.userId || null;
      const oldImageUrl = req.body.oldImageUrl || null;

      // Create file object using helper
      const fileObject = createFileObjectFromRequest(req.file);

      // Call service with complete information
      const result = await uploadService.uploadProfileImage(
        fileObject,
        authReq.user.role,
        userId,
        oldImageUrl
      );
      
      // Return response
      res.status(200).json({
        message: `Image uploaded successfully${result.method === 'presignedUrl' ? ' (using presigned URL)' : ''}`,
        fileUrl: result.fileUrl
      });
    } catch (error: any) {
      next(error);
    }
  },

  listFiles: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get file list
      const files = await uploadService.listFilesService();

      // Ensure files is an array
      if (!Array.isArray(files)) {
        throw new BadRequestError('Invalid files data received');
      }

      // Return response
      res.status(200).json({
        message: 'Files retrieved successfully',
        fileCount: files.length,
        files
      });
    } catch (error: any) {
      next(error);
    }
  }
};

// Export multer for route configuration
export const upload = imageUpload;