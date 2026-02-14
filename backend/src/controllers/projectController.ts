import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';

export class ProjectController {
    async findAll(_req: Request, res: Response, next: NextFunction) {
        try {
            const projects = await projectService.findAll();
            res.json({ success: true, data: projects });
        } catch (error) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const project = await projectService.findById(req.params.id);
            res.json({ success: true, data: project });
        } catch (error) {
            next(error);
        }
    }

    async getTree(req: Request, res: Response, next: NextFunction) {
        try {
            // Check if project exists first
            await projectService.findById(req.params.id);
            const tree = await import('../services/tierService').then((m) => m.tierService.getTree(req.params.id));
            res.json({ success: true, data: tree });
        } catch (error) {
            next(error);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const project = await projectService.create(req.body);
            res.status(201).json({ success: true, data: project });
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const project = await projectService.update(req.params.id, req.body);
            res.json({ success: true, data: project });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await projectService.delete(req.params.id);
            res.json({ success: true, message: 'Project deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export const projectController = new ProjectController();
