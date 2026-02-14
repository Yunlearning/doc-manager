import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter: max 10 attempts per IP per 15 minutes.
 * OWASP A07: Identification and Authentication Failures
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: '登入嘗試次數過多，請 15 分鐘後再試',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.socket.remoteAddress || 'unknown';
    },
});

/**
 * General API rate limiter: max 100 requests per minute per IP.
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
        success: false,
        message: '請求過於頻繁，請稍後再試',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
