import request from 'supertest';
import express from 'express';
import router from '../../src/features/uploads/routes/upload.routes';
import { uploadController } from '../../src/features/uploads/controllers/upload.controller';
import { authenticateJWT } from '../../src/features/uploads/middleware/authenticate.middleware';

// Mock the authentication middleware
jest.mock('../../src/features/uploads/middleware/authenticate.middleware', () => ({
  authenticateJWT: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', role: 'user' };
    next();
  })
}));

// Mock the controller methods
jest.mock('../../src/features/uploads/controllers/upload.controller', () => ({
  uploadController: {
    determineRequestType: jest.fn((req, res, next) => next()),
    processUpload: jest.fn((req, res) => res.json({ success: true })),
    listFiles: jest.fn((req, res) => res.json({ files: [] }))
  }
}));

describe('Upload Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/uploads', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/uploads/profile-image', () => {
    it('should use authentication middleware', async () => {
      await request(app)
        .post('/api/uploads/profile-image')
        .send({});

      expect(authenticateJWT).toHaveBeenCalled();
    });

    it('should call determineRequestType and processUpload middlewares', async () => {
      await request(app)
        .post('/api/uploads/profile-image')
        .send({});

      expect(uploadController.determineRequestType).toHaveBeenCalled();
      expect(uploadController.processUpload).toHaveBeenCalled();
    });

    it('should respond with success when upload is processed', async () => {
      const response = await request(app)
        .post('/api/uploads/profile-image')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/uploads/list-files', () => {
    it('should use authentication middleware', async () => {
      await request(app)
        .get('/api/uploads/list-files');

      expect(authenticateJWT).toHaveBeenCalled();
    });

    it('should call listFiles controller method', async () => {
      await request(app)
        .get('/api/uploads/list-files');

      expect(uploadController.listFiles).toHaveBeenCalled();
    });

    it('should respond with empty files array', async () => {
      const response = await request(app)
        .get('/api/uploads/list-files');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ files: [] });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const mockAuthError = new Error('Unauthorized');
      (authenticateJWT as jest.Mock).mockImplementationOnce((req, res, next) => {
        next(mockAuthError);
      });

      const response = await request(app)
        .post('/api/uploads/profile-image')
        .send({});

      expect(response.status).toBe(500);
    });

    it('should handle upload processing errors', async () => {
      (uploadController.processUpload as jest.Mock).mockImplementationOnce((req, res) => {
        throw new Error('Upload failed');
      });

      const response = await request(app)
        .post('/api/uploads/profile-image')
        .send({});

      expect(response.status).toBe(500);
    });
  });
});