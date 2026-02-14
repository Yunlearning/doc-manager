import { Request, Response, NextFunction } from 'express';
import { authService, JwtPayload } from '../services/authService';
import prisma from '../config/database';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                permissions: string[];
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: '請先登入' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const payload: JwtPayload = authService.verifyToken(token);

        // Fetch user permissions
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                permissions: { select: { permission: true } },
            },
        });

        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: '帳號已停用或不存在' });
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            permissions: user.permissions.map((p) => p.permission),
        };

        next();
    } catch (error: any) {
        res.status(401).json({ success: false, message: error.message || 'Token 驗證失敗' });
    }
};
