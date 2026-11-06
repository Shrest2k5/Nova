import { Router } from 'express';
import { fileController } from './file.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { uploadMiddleware } from '../../middleware/upload.middleware.js';

const router = Router();

// All file routes require authentication
router.use(authenticate);

router.post('/upload', uploadMiddleware.single('file'), fileController.upload);
router.get('/', fileController.list);
router.get('/:id', fileController.getById);
router.get('/:id/status', fileController.getStatus);
router.get('/:id/extracted-text', fileController.getExtractedText);
router.get('/:id/summary', fileController.getSummary);
router.post('/:id/reprocess', fileController.reprocess);
router.get('/:id/download', fileController.download);
router.delete('/:id', fileController.delete);

export default router;
