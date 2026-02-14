import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../src/middlewares/authenticate';
import { checkPermission, adminOnly } from '../src/middlewares/checkPermission';
import { authService } from '../src/services/authService';
import prisma from '../src/config/database';

// ── Mock Prisma ──────────────────────────────────────
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

// ── Mock AuthService ─────────────────────────────────
jest.mock('../src/services/authService', () => ({
    authService: {
        verifyToken: jest.fn(),
    },
    // Re-export JwtPayload so imports don't break
    JwtPayload: {},
}));

// ── Helpers ──────────────────────────────────────────
function mockReq(overrides: Partial<Request> = {}): Request {
    return {
        headers: {},
        user: undefined,
        ...overrides,
    } as unknown as Request;
}

function mockRes(): Response {
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
}

function mockNext(): NextFunction {
    return jest.fn();
}

// ═════════════════════════════════════════════════════
// authenticate middleware
// ═════════════════════════════════════════════════════
describe('authenticate middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 401 if no Authorization header', async () => {
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with Bearer', async () => {
        const req = mockReq({ headers: { authorization: 'Basic abc' } as any });
        const res = mockRes();
        const next = mockNext();

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if token is invalid', async () => {
        (authService.verifyToken as jest.Mock).mockImplementation(() => {
            throw new Error('Token 無效或已過期');
        });

        const req = mockReq({ headers: { authorization: 'Bearer bad.token' } as any });
        const res = mockRes();
        const next = mockNext();

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 if user is disabled', async () => {
        (authService.verifyToken as jest.Mock).mockReturnValue({
            userId: 'u1',
            email: 'test@t.com',
            role: 'USER',
        });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u1',
            email: 'test@t.com',
            role: 'USER',
            isActive: false,
            permissions: [],
        });

        const req = mockReq({ headers: { authorization: 'Bearer valid.token' } as any });
        const res = mockRes();
        const next = mockNext();

        await authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('停用') }),
        );
    });

    it('should set req.user and call next() for valid token + active user', async () => {
        (authService.verifyToken as jest.Mock).mockReturnValue({
            userId: 'u1',
            email: 'admin@t.com',
            role: 'ADMIN',
        });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'u1',
            email: 'admin@t.com',
            role: 'ADMIN',
            isActive: true,
            permissions: [{ permission: 'UPLOAD' }, { permission: 'DOWNLOAD' }],
        });

        const req = mockReq({ headers: { authorization: 'Bearer good.token' } as any });
        const res = mockRes();
        const next = mockNext();

        await authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({
            id: 'u1',
            email: 'admin@t.com',
            role: 'ADMIN',
            permissions: ['UPLOAD', 'DOWNLOAD'],
        });
    });
});

// ═════════════════════════════════════════════════════
// checkPermission middleware
// ═════════════════════════════════════════════════════
describe('checkPermission middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 401 if req.user is not set', () => {
        const middleware = checkPermission('UPLOAD');
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('should bypass permission check for ADMIN role', () => {
        const middleware = checkPermission('UPLOAD', 'DELETE_DOCUMENT');
        const req = mockReq();
        req.user = { id: 'u1', email: 'a@t.com', role: 'ADMIN', permissions: [] };
        const res = mockRes();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should pass if user has all required permissions', () => {
        const middleware = checkPermission('UPLOAD', 'DOWNLOAD');
        const req = mockReq();
        req.user = { id: 'u1', email: 'u@t.com', role: 'USER', permissions: ['UPLOAD', 'DOWNLOAD', 'CREATE_PROJECT'] };
        const res = mockRes();
        const next = mockNext();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user is missing a required permission', () => {
        const middleware = checkPermission('UPLOAD', 'DELETE_DOCUMENT');
        const req = mockReq();
        req.user = { id: 'u1', email: 'u@t.com', role: 'USER', permissions: ['UPLOAD'] };
        const res = mockRes();
        const next = mockNext();

        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});

// ═════════════════════════════════════════════════════
// adminOnly middleware
// ═════════════════════════════════════════════════════
describe('adminOnly middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 401 if req.user is not set', () => {
        const req = mockReq();
        const res = mockRes();
        const next = mockNext();

        adminOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should pass for ADMIN role', () => {
        const req = mockReq();
        req.user = { id: 'u1', email: 'a@t.com', role: 'ADMIN', permissions: [] };
        const res = mockRes();
        const next = mockNext();

        adminOnly(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should return 403 for non-ADMIN role', () => {
        const req = mockReq();
        req.user = { id: 'u1', email: 'u@t.com', role: 'USER', permissions: [] };
        const res = mockRes();
        const next = mockNext();

        adminOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
