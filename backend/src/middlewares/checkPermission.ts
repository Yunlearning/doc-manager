import { Request, Response, NextFunction } from 'express';

/**
 * Permission check middleware.
 * Admin role bypasses all permission checks.
 * Regular users must have ALL specified permissions.
 */
export const checkPermission = (...requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: '請先登入' });
            return;
        }

        // Admin has all permissions
        if (req.user.role === 'ADMIN') {
            return next();
        }

        // Check if user has all required permissions
        const hasAll = requiredPermissions.every((perm) =>
            req.user!.permissions.includes(perm),
        );

        if (!hasAll) {
            res.status(403).json({
                success: false,
                message: '權限不足，請聯繫管理員授予相應權限',
            });
            return;
        }

        next();
    };
};

/**
 * Admin-only middleware.
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({ success: false, message: '請先登入' });
        return;
    }

    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: '僅限管理員操作' });
        return;
    }

    next();
};
