import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { Role, Permission } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-secure-32-char-key!!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const BCRYPT_ROUNDS = 12;

// Password: min 8 chars, upper+lower+digit+special
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
}

export class AuthService {
    async register(email: string, password: string, name: string) {
        // Check email uniqueness
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new AppError(409, '此 Email 已被註冊');
        }

        // Validate password strength
        if (!PASSWORD_REGEX.test(password)) {
            throw new AppError(400, '密碼需至少 8 碼，包含大小寫字母、數字與特殊字元');
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: Role.USER,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        return user;
    }

    async login(email: string, password: string, ipAddress: string, userAgent: string) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                permissions: { select: { permission: true } },
            },
        });

        if (!user) {
            throw new AppError(401, '帳號或密碼錯誤');
        }

        if (!user.isActive) {
            throw new AppError(403, '帳號已被停用，請聯繫管理員');
        }

        // Check account lock
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new AppError(423, `帳號已鎖定，請於 ${remaining} 分鐘後再試`);
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            await this.recordFailedAttempt(user.id);

            // Log failed login
            await this.createLoginLog(user.id, ipAddress, userAgent, false);

            const attemptsLeft = MAX_FAILED_ATTEMPTS - (user.failedAttempts + 1);
            if (attemptsLeft <= 0) {
                throw new AppError(423, `密碼錯誤次數過多，帳號已鎖定 ${LOCK_DURATION_MINUTES} 分鐘`);
            }
            throw new AppError(401, `帳號或密碼錯誤，剩餘 ${attemptsLeft} 次嘗試機會`);
        }

        // Reset failed attempts on success
        await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
        });

        // Log successful login
        await this.createLoginLog(user.id, ipAddress, userAgent, true);

        // Generate JWT
        const token = this.generateToken(user.id, user.email, user.role);

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                permissions: user.permissions.map((p) => p.permission),
            },
        };
    }

    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                permissions: { select: { permission: true } },
            },
        });

        if (!user) {
            throw new AppError(404, '用戶不存在');
        }

        return {
            ...user,
            permissions: user.permissions.map((p) => p.permission),
        };
    }

    async updateProfile(userId: string, name: string) {
        return prisma.user.update({
            where: { id: userId },
            data: { name },
            select: { id: true, email: true, name: true, role: true },
        });
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, '用戶不存在');

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new AppError(401, '目前密碼錯誤');

        if (!PASSWORD_REGEX.test(newPassword)) {
            throw new AppError(400, '新密碼需至少 8 碼，包含大小寫字母、數字與特殊字元');
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });
    }

    async getLoginLogs(userId: string, limit = 20) {
        return prisma.loginLog.findMany({
            where: { userId },
            orderBy: { loginAt: 'desc' },
            take: limit,
            select: {
                id: true,
                ipAddress: true,
                userAgent: true,
                location: true,
                loginAt: true,
                success: true,
            },
        });
    }

    // ── Private helpers ──

    private generateToken(userId: string, email: string, role: Role): string {
        const payload: JwtPayload = { userId, email, role };
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    }

    verifyToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, JWT_SECRET) as JwtPayload;
        } catch {
            throw new AppError(401, 'Token 無效或已過期');
        }
    }

    private async recordFailedAttempt(userId: string) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { failedAttempts: { increment: 1 } },
        });

        if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
            await prisma.user.update({
                where: { id: userId },
                data: { lockedUntil, failedAttempts: 0 },
            });
        }
    }

    private async createLoginLog(
        userId: string,
        ipAddress: string,
        userAgent: string,
        success: boolean,
    ) {
        // Simple IP-to-location (just record IP for now)
        let location: string | null = null;
        try {
            // For local dev, just mark as local
            if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === '::ffff:127.0.0.1') {
                location = 'localhost';
            } else {
                location = ipAddress; // In production, use a geolocation API
            }
        } catch {
            location = 'unknown';
        }

        await prisma.loginLog.create({
            data: { userId, ipAddress, userAgent, location, success },
        });
    }
}

export const authService = new AuthService();
