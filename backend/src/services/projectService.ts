import prisma from '../config/database';
import { CreateProjectInput, UpdateProjectInput } from '../validators/schemas';
import { AppError } from '../middlewares/errorHandler';

export class ProjectService {
    async findAll() {
        return prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { tiers: true } },
            },
        });
    }

    async findById(id: string) {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                _count: { select: { tiers: true } },
            },
        });

        if (!project) {
            throw new AppError(404, 'Project not found');
        }

        return project;
    }

    async create(data: CreateProjectInput) {
        return prisma.project.create({ data });
    }

    async update(id: string, data: UpdateProjectInput) {
        await this.findById(id);
        return prisma.project.update({ where: { id }, data });
    }

    async delete(id: string) {
        await this.findById(id);
        return prisma.project.delete({ where: { id } });
    }
}

export const projectService = new ProjectService();
