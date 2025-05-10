import { Request, Response, NextFunction } from 'express';
import { uploadController, upload } from '../../src/features/uploads/controllers/upload.controller';
import { uploadService } from '../../src/features/uploads/services/upload.service';
import { BadRequestError } from '../../src/utils/errors/api-error';
import { AuthenticatedRequest } from '../../src/features/uploads/middleware/authenticate.middleware';
import multer from 'multer';

// Mock dependencies
jest.mock('../../src/features/uploads/services/upload.service');
jest.mock('uploadthing/express', () => ({
  createRouteHandler: jest.fn().mockReturnValue((req: Request, res: Response, next: NextFunction) => {
    next();
  })
}));

describe('Upload Controller', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      file: undefined
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('determineRequestType', () => {
    it('should handle multipart/form-data requests (mobile clients)', () => {
      mockReq.headers = { 'content-type': 'multipart/form-data' };
      mockReq.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      uploadController.determineRequestType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-multipart requests for admin users (web SDK)', () => {
      mockReq.headers = { 'content-type': 'application/json' };
      mockReq.user = { role: 'admin' };

      uploadController.determineRequestType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject non-admin users for web SDK uploads', () => {
      mockReq.headers = { 'content-type': 'application/json' };
      mockReq.user = { role: 'user' };

      uploadController.determineRequestType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Access denied. Administrator role required to use the web SDK.'
      });
    });

    it('should handle file size limit errors', () => {
      mockReq.headers = { 'content-type': 'multipart/form-data' };
      const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
      
      // Simulate multer error
      jest.spyOn(upload, 'single').mockImplementation(() => {
        return (req: Request, res: Response, next: NextFunction) => {
          next(multerError);
        };
      });

      uploadController.determineRequestType(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
    });
  });

  describe('processUpload', () => {
    it('should successfully process file upload for mobile clients', async () => {
      mockReq = {
        file: {
          buffer: Buffer.from('test'),
          originalname: 'test.jpg',
          mimetype: 'image/jpeg'
        } as Express.Multer.File,
        body: {
          userId: 'test-user',
        },
        user: { role: 'user' }
      };

      (uploadService.uploadProfileImage as jest.Mock).mockResolvedValue({
        fileUrl: 'https://example.com/test.jpg',
        method: 'direct'
      });

      await uploadController.processUpload(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Image uploaded successfully',
        fileUrl: 'https://example.com/test.jpg'
      });
    });
    
  });

  describe('listFiles', () => {
    it('should successfully list files', async () => {
      const mockFiles = [
        {
          name: 'test.jpg',
          key: 'test-key',
          size: 1024,
          uploadedAt: '2025-01-01T00:00:00.000Z',
          customId: 'test-id'
        }
      ];

      (uploadService.listFilesService as jest.Mock).mockResolvedValue(mockFiles);

      await uploadController.listFiles(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Files retrieved successfully',
        fileCount: 1,
        files: mockFiles
      });
    });

   it('should handle listing errors', async () => {
     const mockError = new Error('Listing failed');
     (uploadService.listFilesService as jest.Mock).mockRejectedValue(mockError);

     await uploadController.listFiles(mockReq as Request, mockRes as Response);

     expect(mockRes.status).toHaveBeenCalledWith(500);
     expect(mockRes.json).toHaveBeenCalledWith({
       message: 'Error listing files',
       error: mockError.message
     });
   });
  });
});