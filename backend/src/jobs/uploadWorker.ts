import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { redisConnection } from '../config/redis';
import prisma from '../config/database';
import { UploadJobData } from '../queues/uploadQueue';
import { storageService } from '../services/storageService';

async function processUpload(job: Job<UploadJobData>) {
    const { tempFilePath, originalName, mimeType, fileSize, tierId, title, projectId, documentId, changelog, uploadedById } =
        job.data;

    await job.updateProgress(10);

    // Build object key for cloud/local storage
    const ext = path.extname(originalName);
    const objectKey = `documents/${projectId}/${job.id}${ext}`;

    await job.updateProgress(30);

    // Upload file from temp to storage backend
    await storageService.upload(objectKey, tempFilePath);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    await job.updateProgress(60);

    let docResult;

    if (documentId) {
        // New Version Upload: Snapshot current -> Update Doc
        const currentDoc = await prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!currentDoc) {
            throw new Error('Document not found for version update');
        }

        // Transaction to ensure atomicity
        docResult = await prisma.$transaction(async (tx) => {
            // 1. Create snapshot of current state
            await tx.documentSnapshot.create({
                data: {
                    documentId: currentDoc.id,
                    version: currentDoc.currentVersion,
                    title: currentDoc.title,
                    fileName: currentDoc.fileName,
                    filePath: currentDoc.filePath,
                    mimeType: currentDoc.mimeType,
                    fileSize: currentDoc.fileSize,
                    uploadedById: currentDoc.uploadedById,
                    changelog: null,
                }
            });

            // 2. Update document with new content and increment version
            return await tx.document.update({
                where: { id: documentId },
                data: {
                    title: title,
                    fileName: originalName,
                    filePath: objectKey,
                    mimeType: mimeType,
                    fileSize: BigInt(fileSize),
                    currentVersion: { increment: 1 },
                    uploadedById: uploadedById,
                }
            });
        });

    } else {
        // New Document
        docResult = await prisma.document.create({
            data: {
                tierId,
                title,
                fileName: originalName,
                filePath: objectKey,
                mimeType,
                fileSize: BigInt(fileSize),
                currentVersion: 1,
                uploadedById: uploadedById,
            },
        });
    }

    await job.updateProgress(100);

    return {
        documentId: docResult.id,
        fileName: originalName,
        fileSize,
    };
}

export const uploadWorker = new Worker('document-upload', processUpload, {
    connection: redisConnection,
    concurrency: 3,
});

uploadWorker.on('completed', (job) => {
    console.log(`✅ Upload job ${job.id} completed`);
});

uploadWorker.on('failed', (job, err) => {
    console.error(`❌ Upload job ${job?.id} failed:`, err.message);
});
