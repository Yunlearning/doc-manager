import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate } from '../middlewares/authenticate';
import { adminOnly } from '../middlewares/checkPermission';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, adminOnly);

router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.put('/users/:id/permissions', (req, res, next) => adminController.updatePermissions(req, res, next));
router.patch('/users/:id/toggle', (req, res, next) => adminController.toggleUser(req, res, next));
router.get('/users/:id/login-logs', (req, res, next) => adminController.getUserLoginLogs(req, res, next));

export default router;
