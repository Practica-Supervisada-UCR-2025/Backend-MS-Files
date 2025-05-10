import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticateJWT } from '../middleware/authenticate.middleware';

const router = Router();

/**
 * Unified endpoint for profile image uploads
 * Handles both web clients (using UploadThing SDK) and mobile (Flutter)
 */
router.post(
  '/profile-image',
  authenticateJWT,
  uploadController.determineRequestType,
  uploadController.processUpload
);
router.get(
  '/list-files',
  authenticateJWT,
  uploadController.listFiles
);

export default router;