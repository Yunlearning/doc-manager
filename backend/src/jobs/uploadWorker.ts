import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { redisConnection } from '../config/redis';
import prisma from '../config/database';
import { UploadJobData } from '../queues/uploadQueue';
import { storageService } from '../services/storageService';

async function processUpload(job: Job<UploadJobData>) {
    const { tempFilePath, originalName, mimeType, fileSize, tierId, title, version, projectId } =
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

    // Create database record — filePath now stores the object key
    const document = await prisma.document.create({
        data: {
            tierId,
            title,
            fileName: originalName,
            filePath: objectKey,
            mimeType,
            fileSize: BigInt(fileSize),
            version,
        },
    });

    await job.updateProgress(100);

    return {
        documentId: document.id,
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
