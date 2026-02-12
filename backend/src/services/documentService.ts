import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { uploadQueue, UploadJobData } from '../queues/uploadQueue';
import fs from 'fs';

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
                version: true,
                uploadedAt: true,
                updatedAt: true,
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
        version: string;
    }) {
        // Validate tier exists and get project ID
        const tier = await prisma.documentTier.findUnique({
            where: { id: data.tierId },
            select: { projectId: true },
        });

        if (!tier) {
            throw new AppError(404, 'Tier not found');
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
