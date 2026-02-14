import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const uploadQueue = new Queue('document-upload', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
});

export interface UploadJobData {
    tempFilePath: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    tierId: string;
    title: string;
    projectId: string;
    // Version Table fields
    documentId?: string;  // If present, this is a new version upload
    changelog?: string;
    userId?: string;      // Uploader tracking
}
