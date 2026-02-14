import { AuthService } from '../src/services/authService';
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

// ── Mock Prisma ──────────────────────────────────────
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        loginLog: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

// ── Mock bcrypt ──────────────────────────────────────
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('$2a$12$hashedPassword'),
    compare: jest.fn(),
}));

// ── Mock jsonwebtoken ────────────────────────────────
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest.fn(),
}));

import jwt from 'jsonwebtoken';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        service = new AuthService();
        jest.clearAllMocks();
    });

    // ══════════════════════════════════════════════════
    // register
    // ══════════════════════════════════════════════════
    describe('register', () => {
        it('should register a new user successfully', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.user.create as jest.Mock).mockResolvedValue({
                id: 'u1',
                email: 'new@test.com',
                name: 'New User',
                role: 'USER',
                createdAt: new Date(),
            });

            const result = await service.register('new@test.com', 'Valid@123', 'New User');
            expect(result.email).toBe('new@test.com');
            expect(prisma.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ email: 'new@test.com', role: 'USER' }),
                }),
            );
        });

        it('should throw 409 for duplicate email', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

            await expect(service.register('dup@test.com', 'Valid@123', 'Dup')).rejects.toThrow(
                '此 Email 已被註冊',
            );
        });

        it('should throw 400 for weak password (no uppercase)', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.register('a@b.com', 'nouppercase1!', 'Test')).rejects.toThrow(
                '密碼需至少 8 碼',
            );
        });

        it('should throw 400 for weak password (no special char)', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.register('a@b.com', 'NoSpecial123', 'Test')).rejects.toThrow(
                '密碼需至少 8 碼',
            );
        });

        it('should throw 400 for short password', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.register('a@b.com', 'Ab1!', 'Test')).rejects.toThrow(
                '密碼需至少 8 碼',
            );
        });
    });

    // ══════════════════════════════════════════════════
    // login
    // ══════════════════════════════════════════════════
    describe('login', () => {
        const mockUser = {
            id: 'u1',
            email: 'user@test.com',
            name: 'Test User',
            password: '$2a$12$hashed',
            role: 'USER',
            isActive: true,
            failedAttempts: 0,
            lockedUntil: null,
            permissions: [{ permission: 'UPLOAD' }],
        };

        it('should login successfully with valid credentials', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);
            (prisma.loginLog.create as jest.Mock).mockResolvedValue({});

            const result = await service.login('user@test.com', 'Valid@123', '127.0.0.1', 'Chrome');

            expect(result.token).toBe('mock.jwt.token');
            expect(result.user.email).toBe('user@test.com');
            expect(result.user.permissions).toEqual(['UPLOAD']);
        });

        it('should throw 401 for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.login('nobody@test.com', 'pass', '::1', 'Chrome'),
            ).rejects.toThrow('帳號或密碼錯誤');
        });

        it('should throw 403 for disabled account', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                isActive: false,
            });

            await expect(
                service.login('user@test.com', 'pass', '::1', 'Chrome'),
            ).rejects.toThrow('帳號已被停用');
        });

        it('should throw 423 for locked account', async () => {
            const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                lockedUntil: futureDate,
            });

            await expect(
                service.login('user@test.com', 'pass', '::1', 'Chrome'),
            ).rejects.toThrow('帳號已鎖定');
        });

        it('should throw 401 for wrong password and decrement attempts', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                failedAttempts: 2,
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            (prisma.user.update as jest.Mock).mockResolvedValue({ failedAttempts: 3 });
            (prisma.loginLog.create as jest.Mock).mockResolvedValue({});

            await expect(
                service.login('user@test.com', 'wrong', '::1', 'Chrome'),
            ).rejects.toThrow('帳號或密碼錯誤');
        });

        it('should throw 423 when max failed attempts reached', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                ...mockUser,
                failedAttempts: 4, // 5th attempt will lock
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            (prisma.user.update as jest.Mock).mockResolvedValue({ failedAttempts: 5 });
            (prisma.loginLog.create as jest.Mock).mockResolvedValue({});

            await expect(
                service.login('user@test.com', 'wrong', '::1', 'Chrome'),
            ).rejects.toThrow('帳號已鎖定');
        });
    });

    // ══════════════════════════════════════════════════
    // verifyToken
    // ══════════════════════════════════════════════════
    describe('verifyToken', () => {
        it('should return payload for valid token', () => {
            const payload = { userId: 'u1', email: 'test@t.com', role: 'USER' };
            (jwt.verify as jest.Mock).mockReturnValue(payload);

            const result = service.verifyToken('valid.token');
            expect(result).toEqual(payload);
        });

        it('should throw 401 for invalid token', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('jwt malformed');
            });

            expect(() => service.verifyToken('bad.token')).toThrow('Token 無效或已過期');
        });
    });

    // ══════════════════════════════════════════════════
    // getProfile
    // ══════════════════════════════════════════════════
    describe('getProfile', () => {
        it('should return user profile with permissions', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u1',
                email: 'user@test.com',
                name: 'Test',
                role: 'USER',
                createdAt: new Date(),
                permissions: [{ permission: 'UPLOAD' }, { permission: 'DOWNLOAD' }],
            });

            const result = await service.getProfile('u1');
            expect(result.permissions).toEqual(['UPLOAD', 'DOWNLOAD']);
        });

        it('should throw 404 for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.getProfile('missing')).rejects.toThrow('用戶不存在');
        });
    });

    // ══════════════════════════════════════════════════
    // changePassword
    // ══════════════════════════════════════════════════
    describe('changePassword', () => {
        it('should change password successfully', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u1',
                password: '$2a$12$old',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (prisma.user.update as jest.Mock).mockResolvedValue({});

            await expect(
                service.changePassword('u1', 'Old@Pass1', 'New@Pass1'),
            ).resolves.toBeUndefined();
            expect(prisma.user.update).toHaveBeenCalled();
        });

        it('should throw 401 for wrong current password', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u1',
                password: '$2a$12$old',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.changePassword('u1', 'WrongOld', 'New@Pass1'),
            ).rejects.toThrow('目前密碼錯誤');
        });

        it('should throw 400 for weak new password', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({
                id: 'u1',
                password: '$2a$12$old',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            await expect(
                service.changePassword('u1', 'Old@Pass1', 'weak'),
            ).rejects.toThrow('新密碼需至少 8 碼');
        });

        it('should throw 404 for non-existent user', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.changePassword('missing', 'a', 'b'),
            ).rejects.toThrow('用戶不存在');
        });
    });

    // ══════════════════════════════════════════════════
    // getLoginLogs
    // ══════════════════════════════════════════════════
    describe('getLoginLogs', () => {
        it('should return login logs', async () => {
            const logs = [
                { id: 'l1', ipAddress: '::1', userAgent: 'Chrome', location: 'localhost', loginAt: new Date(), success: true },
            ];
            (prisma.loginLog.findMany as jest.Mock).mockResolvedValue(logs);

            const result = await service.getLoginLogs('u1');
            expect(result).toEqual(logs);
            expect(prisma.loginLog.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: 'u1' }, take: 20 }),
            );
        });
    });
});
