import { Request, Response, NextFunction } from 'express';
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from '../../../config/uploadthing';
import { AuthenticatedRequest } from '../middleware/authenticate.middleware';
import { uploadService } from '../services/upload.service';
import multer from 'multer';
import { BadRequestError, ForbiddenError } from '../../../utils/errors/api-error';
// Multer configuration for file processing
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create the file router for uploadthing routes
export const fileRouter = uploadRouter;

// Export the controller with handlers
export const uploadController = {
  // Middleware to determine request type
  determineRequestType: (req: Request, res: Response, next: NextFunction): void => {
    // Check if it's a multipart request (Flutter) or UploadThing SDK request (web)
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // For mobile clients, process with multer
      upload.single('file')(req, res, (err) => {
        if (err) {
          // Handle specific Multer errors
          if (err instanceof multer.MulterError) {
            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                return next(new BadRequestError('File exceeds size limit (4MB)', [err.code]));
              case 'LIMIT_UNEXPECTED_FILE':
                return next(new BadRequestError('Invalid file field name', [err.code]));
              default:
                return next(new BadRequestError(`Error processing file: ${err.message}`, [err.code]));
            }
          }

          // For other types of errors (like fileFilter errors)
          if (err.message === 'Only image files are allowed') {
            return next(new BadRequestError(err.message, ['INVALID_FILE_TYPE']));
          }

          // Generic error
          return next(new BadRequestError('Error processing file', [err.message]));
        }

        // Verify if there's a file after processing
        if (!req.file) {
          return next(new BadRequestError('No image file was provided', ['NO_FILE_UPLOADED']));
        }
        next(); // Only call next() if there's no error
      });
    } else {
      // For web clients using UploadThing SDK
      const authReq = req as AuthenticatedRequest;
      if (authReq.user?.role === 'admin') {
        // Use a wrapper function to handle UploadThing route
        const handler = createRouteHandler({
          router: fileRouter,
          config: {
            logLevel: "Debug"
          }
        });
        handler(req, res, next);
      } else {
        // Permission error - important not to call next() after sending response
        res.status(403).json({
          message: 'Access denied. Administrator role required to use the web SDK.'
        });
      }
    }
  },

  // Handler to process mobile client uploads
  processUpload: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        return; // Already handled by UploadThing
      }

      const authReq = req as AuthenticatedRequest;

      // Extract additional information
      const userId = req.body.userId || null;
      const oldImageUrl = req.body.oldImageUrl || null;

      // Create file object
      const fileObject = {
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname
      };

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
      console.error('Error uploading file:', error);
      res.status(500).json({
        message: 'Error uploading image',
        error: error.message || 'Unknown error'
      });
    }
  },

  listFiles: async (req: Request, res: Response): Promise<void> => {
    try {
      // Get basic list
      const files = await uploadService.listFilesService();

      // Ensure files is an array
      if (!Array.isArray(files)) {
        throw new Error('Invalid files data received');
      }

      res.status(200).json({
        message: 'Files retrieved successfully',
        fileCount: files.length,
        files
      });
    } catch (error: any) {
      console.error('Error listing files:', error);
      res.status(500).json({
        message: 'Error listing files',
        error: error.message || 'Listing failed'
      });
    }
  }
};