import { ProjectService } from '../src/services/projectService';
import prisma from '../src/config/database';

// Mock Prisma
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        project: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

describe('ProjectService', () => {
    let service: ProjectService;

    beforeEach(() => {
        service = new ProjectService();
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all projects ordered by createdAt desc', async () => {
            const mockProjects = [
                {
                    id: '1',
                    name: 'ISO 27001 Project',
                    description: 'Test',
                    standardType: 'ISO 27001',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    _count: { tiers: 5 },
                },
            ];

            (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

            const result = await service.findAll();
            expect(result).toEqual(mockProjects);
            expect(prisma.project.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { tiers: true } } },
            });
        });
    });

    describe('findById', () => {
        it('should return a project by id', async () => {
            const mockProject = {
                id: '1',
                name: 'ISO 27001 Project',
                standardType: 'ISO 27001',
                _count: { tiers: 3 },
            };

            (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

            const result = await service.findById('1');
            expect(result).toEqual(mockProject);
        });

        it('should throw AppError 404 if project not found', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.findById('non-existent')).rejects.toThrow('Project not found');
        });
    });

    describe('create', () => {
        it('should create a new project', async () => {
            const input = {
                name: 'New Project',
                description: 'Test description',
                standardType: 'ISO 9001',
            };

            const mockCreated = { id: '2', ...input, createdAt: new Date(), updatedAt: new Date() };
            (prisma.project.create as jest.Mock).mockResolvedValue(mockCreated);

            const result = await service.create(input);
            expect(result).toEqual(mockCreated);
            expect(prisma.project.create).toHaveBeenCalledWith({ data: input });
        });
    });

    describe('update', () => {
        it('should update an existing project', async () => {
            const existing = { id: '1', name: 'Old Name', standardType: 'ISO 27001' };
            const updateData = { name: 'Updated Name' };
            const updated = { ...existing, ...updateData };

            (prisma.project.findUnique as jest.Mock).mockResolvedValue(existing);
            (prisma.project.update as jest.Mock).mockResolvedValue(updated);

            const result = await service.update('1', updateData);
            expect(result.name).toBe('Updated Name');
        });
    });

    describe('delete', () => {
        it('should delete a project', async () => {
            const existing = { id: '1', name: 'Delete Me' };
            (prisma.project.findUnique as jest.Mock).mockResolvedValue(existing);
            (prisma.project.delete as jest.Mock).mockResolvedValue(existing);

            const result = await service.delete('1');
            expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: '1' } });
        });

        it('should throw 404 when deleting non-existent project', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.delete('non-existent')).rejects.toThrow('Project not found');
        });
    });
});
