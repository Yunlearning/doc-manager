import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import projectRoutes from './routes/projectRoutes';
import tierRoutes from './routes/tierRoutes';
import documentRoutes from './routes/documentRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import { authenticate } from './middlewares/authenticate';
import { tierController } from './controllers/tierController';

// Load environment variables
dotenv.config();

// Import workers to start processing
import './jobs/uploadWorker';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Security middleware (OWASP A05)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Rate limiting (OWASP A07)
app.use(apiLimiter);

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Public routes ────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Protected routes ─────────────────────────────
app.use('/api/projects', projectRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Tree endpoint (nested under project, needs auth)
app.get('/api/projects/:projectId/tree', authenticate, (req, res, next) =>
    tierController.getTree(req, res, next),
);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📄 API docs: http://localhost:${PORT}/api/health`);
});

export default app;
