import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import projectRoutes from './routes/projectRoutes';
import tierRoutes from './routes/tierRoutes';
import documentRoutes from './routes/documentRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { tierController } from './controllers/tierController';

// Load environment variables
dotenv.config();

// Import workers to start processing
import './jobs/uploadWorker';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/documents', documentRoutes);

// Tree endpoint (nested under project)
app.get('/api/projects/:projectId/tree', (req, res, next) =>
    tierController.getTree(req, res, next),
);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📄 API docs: http://localhost:${PORT}/api/health`);
});

export default app;
