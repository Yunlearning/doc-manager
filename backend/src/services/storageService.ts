import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// ── Interface ────────────────────────────────────────
export interface IStorageService {
    upload(objectKey: string, sourcePath: string): Promise<void>;
    download(objectKey: string): NodeJS.ReadableStream;
    copy(srcKey: string, destKey: string): Promise<void>;
    delete(objectKey: string): Promise<void>;
    exists(objectKey: string): Promise<boolean>;
}

// ── Local Storage ────────────────────────────────────
export class LocalStorageService implements IStorageService {
    private basePath: string;

    constructor(basePath?: string) {
        this.basePath = basePath || path.resolve(__dirname, '../../storage/documents');
    }

    private resolve(objectKey: string): string {
        return path.join(this.basePath, objectKey);
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const dest = this.resolve(objectKey);
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(sourcePath, dest);
    }

    download(objectKey: string): NodeJS.ReadableStream {
        return fs.createReadStream(this.resolve(objectKey));
    }

    async copy(srcKey: string, destKey: string): Promise<void> {
        const src = this.resolve(srcKey);
        const dest = this.resolve(destKey);
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(src, dest);
    }

    async delete(objectKey: string): Promise<void> {
        const filePath = this.resolve(objectKey);
        if (fs.existsSync(filePath)) {
            await fsp.unlink(filePath);
        }
    }

    async exists(objectKey: string): Promise<boolean> {
        return fs.existsSync(this.resolve(objectKey));
    }
}

// ── Google Cloud Storage ─────────────────────────────
export class GcsStorageService implements IStorageService {
    private bucket: any; // ReturnType from @google-cloud/storage

    constructor() {
        // Lazy-loaded to avoid requiring the package when not in use
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({
            projectId: process.env.GCS_PROJECT_ID,
            keyFilename: process.env.GCS_KEYFILE,
        });
        const bucketName = process.env.GCS_BUCKET;
        if (!bucketName) {
            throw new Error('GCS_BUCKET environment variable is required');
        }
        this.bucket = storage.bucket(bucketName);
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        await this.bucket.upload(sourcePath, {
            destination: objectKey,
            resumable: false,
        });
    }

    download(objectKey: string): NodeJS.ReadableStream {
        return this.bucket.file(objectKey).createReadStream();
    }

    async copy(srcKey: string, destKey: string): Promise<void> {
        await this.bucket.file(srcKey).copy(this.bucket.file(destKey));
    }

    async delete(objectKey: string): Promise<void> {
        try {
            await this.bucket.file(objectKey).delete();
        } catch (err: any) {
            if (err.code !== 404) throw err;
        }
    }

    async exists(objectKey: string): Promise<boolean> {
        const [exists] = await this.bucket.file(objectKey).exists();
        return exists;
    }
}

// ── AWS S3 ───────────────────────────────────────────
export class S3StorageService implements IStorageService {
    private client: any;
    private bucket: string;

    constructor() {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.bucket = process.env.AWS_S3_BUCKET || '';
        if (!this.bucket) {
            throw new Error('AWS_S3_BUCKET environment variable is required');
        }
        this.client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        const fileStream = fs.createReadStream(sourcePath);
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
                Body: fileStream,
            }),
        );
    }

    download(objectKey: string): NodeJS.ReadableStream {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        // Return a PassThrough that pipes the S3 response
        const { PassThrough } = require('stream');
        const passThrough = new PassThrough();

        this.client
            .send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }))
            .then((response: any) => {
                response.Body.pipe(passThrough);
            })
            .catch((err: any) => {
                passThrough.destroy(err);
            });

        return passThrough;
    }

    async copy(srcKey: string, destKey: string): Promise<void> {
        const { CopyObjectCommand } = require('@aws-sdk/client-s3');
        await this.client.send(
            new CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: `${this.bucket}/${srcKey}`,
                Key: destKey,
            }),
        );
    }

    async delete(objectKey: string): Promise<void> {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: objectKey,
            }),
        );
    }

    async exists(objectKey: string): Promise<boolean> {
        const { HeadObjectCommand } = require('@aws-sdk/client-s3');
        try {
            await this.client.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
            );
            return true;
        } catch (err: any) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw err;
        }
    }
}

// ── Azure Blob Storage ───────────────────────────────
export class AzureBlobStorageService implements IStorageService {
    private containerClient: any;

    constructor() {
        const { BlobServiceClient } = require('@azure/storage-blob');
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
        }
        const containerName = process.env.AZURE_CONTAINER_NAME;
        if (!containerName) {
            throw new Error('AZURE_CONTAINER_NAME environment variable is required');
        }
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.containerClient = blobServiceClient.getContainerClient(containerName);
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(objectKey);
        await blockBlobClient.uploadFile(sourcePath);
    }

    download(objectKey: string): NodeJS.ReadableStream {
        const { PassThrough } = require('stream');
        const passThrough = new PassThrough();

        const blockBlobClient = this.containerClient.getBlockBlobClient(objectKey);
        blockBlobClient
            .download(0)
            .then((response: any) => {
                response.readableStreamBody.pipe(passThrough);
            })
            .catch((err: any) => {
                passThrough.destroy(err);
            });

        return passThrough;
    }

    async copy(srcKey: string, destKey: string): Promise<void> {
        const srcBlob = this.containerClient.getBlockBlobClient(srcKey);
        const destBlob = this.containerClient.getBlockBlobClient(destKey);
        const poller = await destBlob.beginCopyFromURL(srcBlob.url);
        await poller.pollUntilDone();
    }

    async delete(objectKey: string): Promise<void> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(objectKey);
        try {
            await blockBlobClient.delete();
        } catch (err: any) {
            if (err.statusCode !== 404) throw err;
        }
    }

    async exists(objectKey: string): Promise<boolean> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(objectKey);
        return blockBlobClient.exists();
    }
}

// ── Factory ──────────────────────────────────────────
function createStorageService(): IStorageService {
    const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    switch (provider) {
        case 'gcs':
            return new GcsStorageService();
        case 's3':
            return new S3StorageService();
        case 'azure':
            return new AzureBlobStorageService();
        case 'local':
        default:
            return new LocalStorageService(
                process.env.STORAGE_PATH
                    ? path.resolve(process.env.STORAGE_PATH)
                    : undefined,
            );
    }
}

export const storageService: IStorageService = createStorageService();
