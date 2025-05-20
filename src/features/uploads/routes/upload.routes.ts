import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticateJWT } from '../middleware/authenticate.middleware';

const router = Router();

/**
 * Unified endpoint for image uploads
 * Handles both web clients (using UploadThing SDK) and mobile (Flutter)
 */
router.post(
  '/upload',
  authenticateJWT,
  uploadController.checkRequestType,
  uploadController.processUpload
);
router.get(
  '/listFiles',
  authenticateJWT,
  uploadController.listFiles
);

export default router;