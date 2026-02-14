import { Router } from 'express';
import { documentController } from '../controllers/documentController';
import { upload } from '../middlewares/upload';
import { authenticate } from '../middlewares/authenticate';
import { checkPermission } from '../middlewares/checkPermission';

const router = Router();

// All document routes require authentication
router.use(authenticate);

// Read — any logged-in user
router.get('/', (req, res, next) => documentController.findByTier(req, res, next));
router.get('/jobs/:jobId', (req, res, next) => documentController.getJobStatus(req, res, next));

// Upload — requires UPLOAD permission
router.post('/upload', checkPermission('UPLOAD'), upload.single('file'), (req, res, next) => documentController.upload(req, res, next));

// Download — requires DOWNLOAD permission
router.get('/:id/download', checkPermission('DOWNLOAD'), (req, res, next) => documentController.download(req, res, next));

// Delete — requires DELETE_DOCUMENT permission
router.delete('/:id', checkPermission('DELETE_DOCUMENT'), (req, res, next) => documentController.delete(req, res, next));

export default router;
