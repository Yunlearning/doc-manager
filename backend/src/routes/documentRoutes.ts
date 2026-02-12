import { Router } from 'express';
import { documentController } from '../controllers/documentController';
import { upload } from '../middlewares/upload';

const router = Router();

router.get('/', (req, res, next) => documentController.findByTier(req, res, next));
router.post('/upload', upload.single('file'), (req, res, next) => documentController.upload(req, res, next));
router.get('/jobs/:jobId', (req, res, next) => documentController.getJobStatus(req, res, next));
router.get('/:id/download', (req, res, next) => documentController.download(req, res, next));
router.delete('/:id', (req, res, next) => documentController.delete(req, res, next));

export default router;
