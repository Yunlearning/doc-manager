import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password, name } = req.body;
            const user = await authService.register(email, password, name);
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const ip = req.ip || req.socket.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const result = await authService.login(email, password, ip, userAgent);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }

    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const profile = await authService.getProfile(req.user!.id);
            res.json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { name } = req.body;
            const user = await authService.updateProfile(req.user!.id, name);
            res.json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { currentPassword, newPassword } = req.body;
            await authService.changePassword(req.user!.id, currentPassword, newPassword);
            res.json({ success: true, message: '密碼已更新' });
        } catch (error) {
            next(error);
        }
    }

    async getLoginLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const logs = await authService.getLoginLogs(req.user!.id);
            res.json({ success: true, data: logs });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
