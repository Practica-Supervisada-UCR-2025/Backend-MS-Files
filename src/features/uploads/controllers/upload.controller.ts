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
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Verifica que venga el campo mediaType en el body
      imageUpload.single('file')(req, res, (err) => {
        if (err) {
          return next(handleMulterError(err));
        }

        // Verifica si falta el campo mediaType
        const mediaType = req.body.mediaType;
        if (
          typeof mediaType === 'undefined' ||
          mediaType === null ||
          mediaType === '' ||
          isNaN(Number(mediaType)) ||
          !Number.isInteger(Number(mediaType))
        ) {
          return next(new BadRequestError('mediaType (int) is required', ['MEDIA_TYPE_REQUIRED']));
        }

        // Verifica si hay archivo
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
      const userId = req.body.userId || null;
      const oldImageUrl = req.body.oldImageUrl || null;
      const fileType = typeof req.body.fileType !== 'undefined' ? parseInt(req.body.fileType, 10) : 0;

      const fileObject = createFileObjectFromRequest(req.file);

      const result = await uploadService.uploadMediaFile(
        fileObject,
        authReq.user.role,
        userId,
        oldImageUrl,
        fileType
      );
      
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