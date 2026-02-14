import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middlewares/authenticate';
import { loginLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../validators/schemas';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));

// Protected routes
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
router.put('/profile', authenticate, validate(updateProfileSchema), (req, res, next) => authController.updateProfile(req, res, next));
router.put('/password', authenticate, validate(changePasswordSchema), (req, res, next) => authController.changePassword(req, res, next));
router.get('/login-logs', authenticate, (req, res, next) => authController.getLoginLogs(req, res, next));

export default router;
