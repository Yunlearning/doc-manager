import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { uploadQueue, UploadJobData } from '../queues/uploadQueue';
import path from 'path';
import { storageService } from './storageService';

export class DocumentService {
    async findByTier(tierId: string) {
        // Get documents with their latest version info
        const documents = await prisma.document.findMany({
            where: { tierId },
            orderBy: { updatedAt: 'desc' },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, email: true },
                },
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1,
                    select: {
                        fileName: true,
                        mimeType: true,
                        fileSize: true,
                        changelog: true,
                    },
                },
            },
        });

        // Flatten latest version data into document response
        return documents.map((doc) => {
            const latest = doc.versions[0];
            return {
                id: doc.id,
                tierId: doc.tierId,
                title: doc.title,
                currentVersion: doc.currentVersion,
                fileName: latest?.fileName || '',
                mimeType: latest?.mimeType || '',
                fileSize: latest ? latest.fileSize.toString() : '0',
                changelog: latest?.changelog || null,
                uploadedAt: doc.createdAt.toISOString(),
                updatedAt: doc.updatedAt.toISOString(),
                uploadedBy: doc.uploadedBy,
            };
        });
    }

    async findById(id: string) {
        const doc = await prisma.document.findUnique({
            where: { id },
            include: {
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1,
                },
            },
        });
        if (!doc) {
            throw new AppError(404, 'Document not found');
        }
        return doc;
    }

    async enqueueUpload(data: {
        tempFilePath: string;
        originalName: string;
        mimeType: string;
        fileSize: number;
        tierId: string;
        title: string;
        documentId?: string;
        changelog?: string;
        userId?: string;
    }) {
        // Validate tier exists and get project ID
        const tier = await prisma.documentTier.findUnique({
            where: { id: data.tierId },
            select: { projectId: true },
        });

        if (!tier) {
            throw new AppError(404, 'Tier not found');
        }

        // If updating a document, validate it exists
        if (data.documentId) {
            const doc = await prisma.document.findUnique({
                where: { id: data.documentId },
            });
            if (!doc) {
                throw new AppError(404, 'Document not found');
            }
        }

        const jobData: UploadJobData = {
            ...data,
            projectId: tier.projectId,
        };

        const job = await uploadQueue.add('upload', jobData);
        return { jobId: job.id };
    }

    async getJobStatus(jobId: string) {
        const job = await uploadQueue.getJob(jobId);
        if (!job) {
            throw new AppError(404, 'Job not found');
        }

        const state = await job.getState();
        const progress = job.progress;
        const result = job.returnvalue;
        const failedReason = job.failedReason;

        return {
            jobId: job.id,
            state,
            progress,
            result,
            failedReason,
        };
    }

    // ── Version Table specific methods ──────────────────

    async getHistory(documentId: string) {
        // Verify document exists
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) {
            throw new AppError(404, 'Document not found');
        }

        return prisma.documentVersion.findMany({
            where: { documentId },
            orderBy: { versionNumber: 'desc' },
            select: {
                id: true,
                documentId: true,
                versionNumber: true,
                title: true,
                fileName: true,
                fileSize: true,
                changelog: true,
                createdAt: true,
                uploadedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async revert(documentId: string, versionId: string, userId: string) {
        // Get the target version
        const targetVersion = await prisma.documentVersion.findUnique({
            where: { id: versionId },
        });

        if (!targetVersion || targetVersion.documentId !== documentId) {
            throw new AppError(404, 'Version not found for this document');
        }

        // Get current document
        const doc = await prisma.document.findUniqueOrThrow({
            where: { id: documentId },
        });

        const newVersionNumber = doc.currentVersion + 1;

        // Copy the target version's file to a new object key
        const newFileName = `revert-v${newVersionNumber}-${path.basename(targetVersion.filePath)}`;
        const dirKey = path.dirname(targetVersion.filePath).replace(/\\/g, '/');
        const newObjectKey = `${dirKey}/${newFileName}`;
        await storageService.copy(targetVersion.filePath, newObjectKey);

        // Create new DocumentVersion for the revert
        return prisma.$transaction(async (tx) => {
            await tx.documentVersion.create({
                data: {
                    documentId,
                    versionNumber: newVersionNumber,
                    title: targetVersion.title,
                    fileName: targetVersion.fileName,
                    filePath: newObjectKey,
                    mimeType: targetVersion.mimeType,
                    fileSize: targetVersion.fileSize,
                    changelog: `Reverted to version ${targetVersion.versionNumber}`,
                    uploadedById: userId,
                },
            });

            // Update Document pointer
            return tx.document.update({
                where: { id: documentId },
                data: {
                    title: targetVersion.title,
                    currentVersion: newVersionNumber,
                    uploadedById: userId,
                },
                include: {
                    versions: {
                        orderBy: { versionNumber: 'desc' },
                        take: 1,
                        select: {
                            fileName: true,
                            mimeType: true,
                            fileSize: true,
                            changelog: true,
                        },
                    },
                },
            });
        });
    }

    async getFileInfo(id: string) {
        // Get document with latest version
        const doc = await prisma.document.findUnique({
            where: { id },
            include: {
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    take: 1,
                },
            },
        });

        if (!doc) {
            throw new AppError(404, 'Document not found');
        }

        const latestVersion = doc.versions[0];
        if (!latestVersion) {
            throw new AppError(404, 'No version found for this document');
        }

        const fileExists = await storageService.exists(latestVersion.filePath);
        if (!fileExists) {
            throw new AppError(404, 'File not found in storage');
        }

        return {
            objectKey: latestVersion.filePath,
            fileName: latestVersion.fileName,
            mimeType: latestVersion.mimeType,
        };
    }

    async delete(id: string) {
        // Get all versions to delete files
        const versions = await prisma.documentVersion.findMany({
            where: { documentId: id },
        });

        // Delete files from storage
        for (const v of versions) {
            try {
                await storageService.delete(v.filePath);
            } catch {
                // Ignore deletion errors (file may already be gone)
            }
        }

        // Cascade delete handles DocumentVersion records
        return prisma.document.delete({ where: { id } });
    }
}

export const documentService = new DocumentService();
