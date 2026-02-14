import { TierService } from '../src/services/tierService';
import prisma from '../src/config/database';

// Mock Prisma
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        documentTier: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        project: {
            findUnique: jest.fn(),
        },
    },
}));

describe('TierService', () => {
    let service: TierService;

    beforeEach(() => {
        service = new TierService();
        jest.clearAllMocks();
    });

    describe('findByProject', () => {
        it('should return tiers for a project ordered by level and sort order', async () => {
            const mockTiers = [
                { id: 't1', name: '品質手冊', tierLevel: 1, sortOrder: 0, _count: { documents: 2, children: 1 } },
                { id: 't2', name: '程序書-A', tierLevel: 2, sortOrder: 0, _count: { documents: 3, children: 0 } },
            ];

            (prisma.documentTier.findMany as jest.Mock).mockResolvedValue(mockTiers);

            const result = await service.findByProject('project-1');
            expect(result).toEqual(mockTiers);
            expect(prisma.documentTier.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { projectId: 'project-1' },
                    orderBy: [{ tierLevel: 'asc' }, { sortOrder: 'asc' }],
                }),
            );
        });
    });

    describe('getTree', () => {
        it('should build a tree structure from flat tier data', async () => {
            const mockTiers = [
                { id: 'root', parentId: null, tierLevel: 1, name: '品質手冊', documents: [] },
                { id: 'child1', parentId: 'root', tierLevel: 2, name: '程序書-A', documents: [] },
                { id: 'child2', parentId: 'root', tierLevel: 2, name: '程序書-B', documents: [] },
                {
                    id: 'grandchild',
                    parentId: 'child1',
                    tierLevel: 3,
                    name: '作業指導書-1',
                    documents: [
                        {
                            id: 'doc1',
                            title: 'Test Doc',
                            currentVersion: 1,
                            createdAt: new Date(),
                            versions: [
                                {
                                    fileName: 'test.pdf',
                                    mimeType: 'application/pdf',
                                    fileSize: BigInt(1024),
                                },
                            ],
                        },
                    ],
                },
            ];

            (prisma.documentTier.findMany as jest.Mock).mockResolvedValue(mockTiers);

            const tree = await service.getTree('project-1');

            // Root should have 2 children
            expect(tree).toHaveLength(1);
            expect(tree[0].name).toBe('品質手冊');
            expect(tree[0].children).toHaveLength(2);

            // child1 should have 1 grandchild
            const child1 = tree[0].children.find((c: any) => c.id === 'child1');
            expect(child1.children).toHaveLength(1);
            expect(child1.children[0].name).toBe('作業指導書-1');

            // Grandchild should have 1 document with string fileSize
            expect(child1.children[0].documents[0].fileSize).toBe('1024');
        });

        it('should return empty array for project with no tiers', async () => {
            (prisma.documentTier.findMany as jest.Mock).mockResolvedValue([]);

            const tree = await service.getTree('empty-project');
            expect(tree).toEqual([]);
        });
    });

    describe('create', () => {
        it('should create a tier when project exists', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
            (prisma.documentTier.create as jest.Mock).mockResolvedValue({
                id: 'new-tier',
                name: '品質手冊',
                tierLevel: 1,
            });

            const result = await service.create({
                projectId: 'p1',
                name: '品質手冊',
                tierLevel: 1,
                sortOrder: 0,
            });

            expect(result.name).toBe('品質手冊');
        });

        it('should throw 404 when project does not exist', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.create({ projectId: 'invalid', name: 'Test', tierLevel: 1, sortOrder: 0 }),
            ).rejects.toThrow('Project not found');
        });

        it('should throw 404 when parent tier does not exist', async () => {
            (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.create({
                    projectId: 'p1',
                    parentId: 'invalid-parent',
                    name: 'Test',
                    tierLevel: 2,
                    sortOrder: 0,
                }),
            ).rejects.toThrow('Parent tier not found');
        });
    });

    describe('delete', () => {
        it('should delete a tier', async () => {
            const tier = { id: 't1', name: 'Delete Me', documents: [], children: [] };
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue(tier);
            (prisma.documentTier.delete as jest.Mock).mockResolvedValue(tier);

            await service.delete('t1');
            expect(prisma.documentTier.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
        });
    });
});
