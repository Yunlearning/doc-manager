import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { uploadQueue, UploadJobData } from '../queues/uploadQueue';
import fs from 'fs';
import path from 'path';

export class DocumentService {
    async findByTier(tierId: string) {
        return prisma.document.findMany({
            where: { tierId },
            orderBy: { uploadedAt: 'desc' },
            select: {
                id: true,
                title: true,
                fileName: true,
                mimeType: true,
                fileSize: true,
                currentVersion: true,
                uploadedAt: true,
                updatedAt: true,
                uploadedBy: {
                    select: { name: true, email: true }
                }
            },
        });
    }

    async findById(id: string) {
        const doc = await prisma.document.findUnique({ where: { id } });
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
        uploadedById: string;
    }) {
        // Validate tier exists and get project ID
        const tier = await prisma.documentTier.findUnique({
            where: { id: data.tierId },
            select: { projectId: true },
        });

        if (!tier) {
            throw new AppError(404, 'Tier not found');
        }

        // If documentId is provided, verify it exists and belongs to the tier
        if (data.documentId) {
            const doc = await prisma.document.findUnique({
                where: { id: data.documentId },
            });
            if (!doc) {
                throw new AppError(404, 'Document not found');
            }
            if (doc.tierId !== data.tierId) {
                throw new AppError(400, 'Document does not belong to the specified tier');
            }
        }

        const jobData: UploadJobData = {
            ...data,
            projectId: tier.projectId,
        };

        const job = await uploadQueue.add('upload', jobData);
        return { jobId: job.id };
    }

    async getHistory(documentId: string) {
        return prisma.documentSnapshot.findMany({
            where: { documentId },
            orderBy: { version: 'desc' },
            include: {
                uploadedBy: {
                    select: { name: true, email: true },
                },
            },
        });
    }

    async revert(documentId: string, snapshotId: string, userId: string) {
        const snapshot = await prisma.documentSnapshot.findUnique({
            where: { id: snapshotId },
        });

        if (!snapshot || snapshot.documentId !== documentId) {
            throw new AppError(404, 'Snapshot not found');
        }

        const doc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!doc) {
            throw new AppError(404, 'Document not found');
        }

        // To revert, we create a new version based on the snapshot
        // 1. Snapshot the current state
        await prisma.documentSnapshot.create({
            data: {
                documentId: doc.id,
                version: doc.currentVersion,
                title: doc.title,
                fileName: doc.fileName,
                filePath: doc.filePath,
                mimeType: doc.mimeType,
                fileSize: doc.fileSize,
                uploadedById: doc.uploadedById,
                changelog: `Revert to version ${snapshot.version}`,
            },
        });

        // 2. Update document with snapshot content (new version)
        // Note: We use the snapshot's file path. If we wanted full separation, we'd copy the file.
        // For now, sharing the file path is efficient, but deleting one might affect others if not careful.
        // A robust system would copy the file to a new path. ensuring immutability.
        // Let's copy the file to a new path to be safe and consistent with "new version" logic.

        const newFileName = `revert_${Date.now()}_${snapshot.fileName}`;
        const newFilePath = path.join(path.dirname(snapshot.filePath), newFileName);

        if (fs.existsSync(snapshot.filePath)) {
            await fs.promises.copyFile(snapshot.filePath, newFilePath);
        } else {
            throw new AppError(500, 'Original snapshot file missing on disk');
        }

        const updatedDoc = await prisma.document.update({
            where: { id: documentId },
            data: {
                title: snapshot.title,
                fileName: snapshot.fileName,
                filePath: newFilePath,
                mimeType: snapshot.mimeType,
                fileSize: snapshot.fileSize,
                currentVersion: doc.currentVersion + 1,
                uploadedById: userId, // The user performing the revert is the "uploader" of this new version
                changelog: `Reverted to version ${snapshot.version}`,
            },
        });

        return updatedDoc;
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

    async getFilePath(id: string) {
        const doc = await this.findById(id);

        if (!fs.existsSync(doc.filePath)) {
            throw new AppError(404, 'File not found on disk');
        }

        return {
            filePath: doc.filePath,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
        };
    }

    async delete(id: string) {
        const doc = await this.findById(id);

        // Delete file from disk
        if (fs.existsSync(doc.filePath)) {
            fs.unlinkSync(doc.filePath);
        }

        return prisma.document.delete({ where: { id } });
    }
}

export const documentService = new DocumentService();
