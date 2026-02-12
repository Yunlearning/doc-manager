import { Request, Response, NextFunction } from 'express';
import { tierService } from '../services/tierService';

export class TierController {
    async findByProject(req: Request, res: Response, next: NextFunction) {
        try {
            const { projectId } = req.query;
            if (!projectId || typeof projectId !== 'string') {
                res.status(400).json({ success: false, message: 'projectId query param is required' });
                return;
            }
            const tiers = await tierService.findByProject(projectId);
            res.json({ success: true, data: tiers });
        } catch (error) {
            next(error);
        }
    }

    async getTree(req: Request, res: Response, next: NextFunction) {
        try {
            const tree = await tierService.getTree(req.params.projectId);
            res.json({ success: true, data: tree });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tier = await tierService.create(req.body);
            res.status(201).json({ success: true, data: tier });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tier = await tierService.update(req.params.id, req.body);
            res.json({ success: true, data: tier });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await tierService.delete(req.params.id);
            res.json({ success: true, message: 'Tier deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export const tierController = new TierController();
