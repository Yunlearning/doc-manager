import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { Permission } from '@prisma/client';

export class AdminController {
    async listUsers(_req: Request, res: Response, next: NextFunction) {
        try {
            const users = await prisma.user.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    permissions: { select: { permission: true } },
                    _count: { select: { loginLogs: true } },
                },
            });

            const data = users.map((u) => ({
                ...u,
                permissions: u.permissions.map((p) => p.permission),
            }));

            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }

    async updatePermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const { permissions } = req.body as { permissions: Permission[] };

            // Validate user exists
            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) throw new AppError(404, '用戶不存在');

            // Cannot modify admin permissions
            if (user.role === 'ADMIN') {
                throw new AppError(400, '無法修改管理員權限');
            }

            // Delete existing permissions and recreate
            await prisma.userPermission.deleteMany({ where: { userId: id } });

            if (permissions.length > 0) {
                await prisma.userPermission.createMany({
                    data: permissions.map((permission) => ({
                        userId: id,
                        permission,
                    })),
                });
            }

            res.json({ success: true, message: '權限已更新' });
        } catch (error) {
            next(error);
        }
    }

    async toggleUser(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = await prisma.user.findUnique({ where: { id } });
            if (!user) throw new AppError(404, '用戶不存在');

            if (user.role === 'ADMIN') {
                throw new AppError(400, '無法停用管理員帳號');
            }

            const updated = await prisma.user.update({
                where: { id },
                data: { isActive: !user.isActive },
                select: { id: true, email: true, isActive: true },
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }

    async getUserLoginLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const logs = await prisma.loginLog.findMany({
                where: { userId: id },
                orderBy: { loginAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    ipAddress: true,
                    userAgent: true,
                    location: true,
                    loginAt: true,
                    success: true,
                },
            });
            res.json({ success: true, data: logs });
        } catch (error) {
            next(error);
        }
    }
}

export const adminController = new AdminController();
