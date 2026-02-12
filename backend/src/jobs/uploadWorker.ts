import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { redisConnection } from '../config/redis';
import prisma from '../config/database';
import { UploadJobData } from '../queues/uploadQueue';

const STORAGE_BASE = path.resolve(__dirname, '../../storage/documents');

async function processUpload(job: Job<UploadJobData>) {
    const { tempFilePath, originalName, mimeType, fileSize, tierId, title, version, projectId } =
        job.data;

    await job.updateProgress(10);

    // Create project directory if not exists
    const projectDir = path.join(STORAGE_BASE, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    // Generate unique file name
    const ext = path.extname(originalName);
    const storedFileName = `${job.id}${ext}`;
    const finalPath = path.join(projectDir, storedFileName);

    await job.updateProgress(30);

    // Move file from temp to final storage
    await fs.copyFile(tempFilePath, finalPath);
    await fs.unlink(tempFilePath);

    await job.updateProgress(60);

    // Create database record
    const document = await prisma.document.create({
        data: {
            tierId,
            title,
            fileName: originalName,
            filePath: finalPath,
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
