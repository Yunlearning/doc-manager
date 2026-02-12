import { DocumentService } from '../src/services/documentService';
import prisma from '../src/config/database';

// Mock Prisma
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        document: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        documentTier: {
            findUnique: jest.fn(),
        },
    },
}));

// Mock upload queue
jest.mock('../src/queues/uploadQueue', () => ({
    uploadQueue: {
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
        getJob: jest.fn(),
    },
}));

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    unlinkSync: jest.fn(),
}));

import { uploadQueue } from '../src/queues/uploadQueue';
import fs from 'fs';

describe('DocumentService', () => {
    let service: DocumentService;

    beforeEach(() => {
        service = new DocumentService();
        jest.clearAllMocks();
    });

    describe('findByTier', () => {
        it('should return documents for a tier', async () => {
            const mockDocs = [
                {
                    id: 'd1',
                    title: 'Test Document',
                    fileName: 'test.pdf',
                    mimeType: 'application/pdf',
                    fileSize: BigInt(2048),
                    version: 'v1.0',
                    uploadedAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocs);

            const result = await service.findByTier('tier-1');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Test Document');
        });
    });

    describe('enqueueUpload', () => {
        it('should enqueue an upload job when tier exists', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue({ projectId: 'p1' });

            const result = await service.enqueueUpload({
                tempFilePath: '/tmp/test.pdf',
                originalName: 'test.pdf',
                mimeType: 'application/pdf',
                fileSize: 2048,
                tierId: 'tier-1',
                title: 'Test Upload',
                version: 'v1.0',
            });

            expect(result.jobId).toBe('job-1');
            expect(uploadQueue.add).toHaveBeenCalledWith('upload', expect.objectContaining({
                tierId: 'tier-1',
                title: 'Test Upload',
                projectId: 'p1',
            }));
        });

        it('should throw 404 when tier does not exist', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.enqueueUpload({
                    tempFilePath: '/tmp/test.pdf',
                    originalName: 'test.pdf',
                    mimeType: 'application/pdf',
                    fileSize: 2048,
                    tierId: 'invalid',
                    title: 'Test',
                    version: 'v1.0',
                }),
            ).rejects.toThrow('Tier not found');
        });
    });

    describe('getFilePath', () => {
        it('should return file info for download', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: '/storage/test.pdf',
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                version: 'v1.0',
                uploadedAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = await service.getFilePath('d1');
            expect(result.filePath).toBe('/storage/test.pdf');
            expect(result.fileName).toBe('test.pdf');
        });

        it('should throw 404 when file does not exist on disk', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: '/storage/missing.pdf',
                fileName: 'missing.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                version: 'v1.0',
                uploadedAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await expect(service.getFilePath('d1')).rejects.toThrow('File not found on disk');
        });
    });

    describe('delete', () => {
        it('should delete document and file from disk', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: '/storage/test.pdf',
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                version: 'v1.0',
                uploadedAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (prisma.document.delete as jest.Mock).mockResolvedValue(mockDoc);

            await service.delete('d1');
            expect(fs.unlinkSync).toHaveBeenCalledWith('/storage/test.pdf');
            expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
        });
    });
});
