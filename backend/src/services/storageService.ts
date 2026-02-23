import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

// ── Interface ────────────────────────────────────────
export interface IStorageService {
    upload(objectKey: string, sourcePath: string): Promise<void>;
    download(objectKey: string): NodeJS.ReadableStream;
    delete(objectKey: string): Promise<void>;
    exists(objectKey: string): Promise<boolean>;
}

// ── Local ────────────────────────────────────────────
class LocalStorageService implements IStorageService {
    private basePath: string;

    constructor(basePath?: string) {
        this.basePath = basePath || path.resolve(__dirname, '../../storage/documents');
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const dest = path.join(this.basePath, objectKey);
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        await fs.promises.copyFile(sourcePath, dest);
    }

    download(objectKey: string): NodeJS.ReadableStream {
        const filePath = path.join(this.basePath, objectKey);
        return fs.createReadStream(filePath);
    }

    async delete(objectKey: string): Promise<void> {
        const filePath = path.join(this.basePath, objectKey);
        await fs.promises.unlink(filePath);
    }

    async exists(objectKey: string): Promise<boolean> {
        const filePath = path.join(this.basePath, objectKey);
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// ── GCS ──────────────────────────────────────────────
class GcsStorageService implements IStorageService {
    private bucket: any;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({
            keyFilename: process.env.GCS_KEYFILE,
            projectId: process.env.GCS_PROJECT_ID,
        });
        this.bucket = storage.bucket(process.env.GCS_BUCKET);
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        await this.bucket.upload(sourcePath, { destination: objectKey });
    }

    download(objectKey: string): NodeJS.ReadableStream {
        return this.bucket.file(objectKey).createReadStream();
    }

    async delete(objectKey: string): Promise<void> {
        await this.bucket.file(objectKey).delete();
    }

    async exists(objectKey: string): Promise<boolean> {
        const [exists] = await this.bucket.file(objectKey).exists();
        return exists;
    }
}

// ── AWS S3 ───────────────────────────────────────────
class S3StorageService implements IStorageService {
    private client: any;
    private bucket: string;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { S3Client } = require('@aws-sdk/client-s3');
        this.client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucket = process.env.AWS_S3_BUCKET || '';
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        const body = fs.createReadStream(sourcePath);
        await this.client.send(
            new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: body }),
        );
    }

    download(objectKey: string): NodeJS.ReadableStream {
        const { GetObjectCommand } = require('@aws-sdk/client-s3');
        const passThrough = new (require('stream').PassThrough)();

        this.client
            .send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }))
            .then((res: any) => res.Body.pipe(passThrough))
            .catch((err: Error) => passThrough.destroy(err));

        return passThrough;
    }

    async delete(objectKey: string): Promise<void> {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
        );
    }

    async exists(objectKey: string): Promise<boolean> {
        const { HeadObjectCommand } = require('@aws-sdk/client-s3');
        try {
            await this.client.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
            );
            return true;
        } catch {
            return false;
        }
    }
}

// ── Azure Blob ───────────────────────────────────────
class AzureBlobStorageService implements IStorageService {
    private containerClient: any;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { BlobServiceClient } = require('@azure/storage-blob');
        const blobService = BlobServiceClient.fromConnectionString(
            process.env.AZURE_STORAGE_CONNECTION_STRING || '',
        );
        this.containerClient = blobService.getContainerClient(
            process.env.AZURE_CONTAINER_NAME || '',
        );
    }

    async upload(objectKey: string, sourcePath: string): Promise<void> {
        const blockBlob = this.containerClient.getBlockBlobClient(objectKey);
        await blockBlob.uploadFile(sourcePath);
    }

    download(objectKey: string): NodeJS.ReadableStream {
        const blockBlob = this.containerClient.getBlockBlobClient(objectKey);
        const passThrough = new (require('stream').PassThrough)();

        blockBlob
            .download(0)
            .then((res: any) => res.readableStreamBody.pipe(passThrough))
            .catch((err: Error) => passThrough.destroy(err));

        return passThrough;
    }

    async delete(objectKey: string): Promise<void> {
        const blockBlob = this.containerClient.getBlockBlobClient(objectKey);
        await blockBlob.delete();
    }

    async exists(objectKey: string): Promise<boolean> {
        const blockBlob = this.containerClient.getBlockBlobClient(objectKey);
        return blockBlob.exists();
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
