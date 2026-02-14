import prisma from '../config/database';
import { CreateTierInput, UpdateTierInput } from '../validators/schemas';
import { AppError } from '../middlewares/errorHandler';

export class TierService {
    async findByProject(projectId: string) {
        return prisma.documentTier.findMany({
            where: { projectId },
            orderBy: [{ tierLevel: 'asc' }, { sortOrder: 'asc' }],
            include: {
                _count: { select: { documents: true, children: true } },
            },
        });
    }

    async findById(id: string) {
        const tier = await prisma.documentTier.findUnique({
            where: { id },
            include: {
                documents: true,
                children: true,
            },
        });

        if (!tier) {
            throw new AppError(404, 'Tier not found');
        }

        return tier;
    }

    async getTree(projectId: string) {
        // Fetch all tiers for the project
        const tiers = await prisma.documentTier.findMany({
            where: { projectId },
            orderBy: [{ tierLevel: 'asc' }, { sortOrder: 'asc' }],
            include: {
                documents: {
                    orderBy: { updatedAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        currentVersion: true,
                        createdAt: true,
                        versions: {
                            orderBy: { versionNumber: 'desc' },
                            take: 1,
                            select: {
                                fileName: true,
                                mimeType: true,
                                fileSize: true,
                            },
                        },
                    },
                },
            },
        });

        // Build tree structure
        type TierWithDocs = (typeof tiers)[number];
        const tierMap = new Map<string, any>();
        const roots: any[] = [];

        // First pass: create map entries with serialized data
        tiers.forEach((tier: TierWithDocs) => {
            tierMap.set(tier.id, {
                ...tier,
                documents: tier.documents.map((doc: any) => {
                    const latest = doc.versions?.[0];
                    return {
                        id: doc.id,
                        title: doc.title,
                        currentVersion: doc.currentVersion,
                        fileName: latest?.fileName || '',
                        mimeType: latest?.mimeType || '',
                        fileSize: latest ? latest.fileSize.toString() : '0',
                        uploadedAt: doc.createdAt?.toISOString?.() || doc.createdAt,
                    };
                }),
                children: [],
            });
        });

        // Second pass: build tree
        tiers.forEach((tier: TierWithDocs) => {
            const node = tierMap.get(tier.id)!;
            if (tier.parentId && tierMap.has(tier.parentId)) {
                tierMap.get(tier.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    async create(data: CreateTierInput) {
        // Validate project exists
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
        });
        if (!project) {
            throw new AppError(404, 'Project not found');
        }

        // Validate parent tier if provided
        if (data.parentId) {
            const parent = await prisma.documentTier.findUnique({
                where: { id: data.parentId },
            });
            if (!parent) {
                throw new AppError(404, 'Parent tier not found');
            }
            if (parent.projectId !== data.projectId) {
                throw new AppError(400, 'Parent tier must belong to the same project');
            }
        }

        return prisma.documentTier.create({
            data: {
                projectId: data.projectId,
                parentId: data.parentId || null,
                name: data.name,
                tierLevel: data.tierLevel,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }

    async update(id: string, data: UpdateTierInput) {
        await this.findById(id);
        return prisma.documentTier.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        await this.findById(id);
        return prisma.documentTier.delete({ where: { id } });
    }
}

export const tierService = new TierService();
