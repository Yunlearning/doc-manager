import { DocumentService } from '../src/services/documentService';
import prisma from '../src/config/database';

// ── Mock Prisma ──────────────────────────────────────
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        document: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        documentTier: {
            findUnique: jest.fn(),
        },
        documentSnapshot: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
        },
    },
}));

// ── Mock upload queue ────────────────────────────────
jest.mock('../src/queues/uploadQueue', () => ({
    uploadQueue: {
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
        getJob: jest.fn(),
    },
}));

// ── Mock storageService ──────────────────────────────
jest.mock('../src/services/storageService', () => ({
    storageService: {
        upload: jest.fn().mockResolvedValue(undefined),
        download: jest.fn(),
        copy: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(true),
    },
}));

import { uploadQueue } from '../src/queues/uploadQueue';
import { storageService } from '../src/services/storageService';
const mockStorageService = storageService as jest.Mocked<typeof storageService>;

describe('DocumentService', () => {
    let service: DocumentService;

    beforeEach(() => {
        service = new DocumentService();
        jest.clearAllMocks();
        mockStorageService.exists.mockResolvedValue(true);
    });

    // ══════════════════════════════════════════════════
    // findByTier
    // ══════════════════════════════════════════════════
    describe('findByTier', () => {
        it('should return documents for a tier', async () => {
            const mockDocs = [
                {
                    id: 'd1',
                    title: 'Test Document',
                    fileName: 'test.pdf',
                    mimeType: 'application/pdf',
                    fileSize: BigInt(2048),
                    currentVersion: 1,
                    uploadedAt: new Date(),
                    updatedAt: new Date(),
                    uploadedBy: { name: 'Admin', email: 'admin@test.com' },
                },
            ];

            (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocs);

            const result = await service.findByTier('tier-1');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Test Document');
        });
    });

    // ══════════════════════════════════════════════════
    // enqueueUpload
    // ══════════════════════════════════════════════════
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
                uploadedById: 'u1',
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
                    uploadedById: 'u1',
                }),
            ).rejects.toThrow('Tier not found');
        });

        it('should throw 404 when documentId does not exist', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue({ projectId: 'p1' });
            (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.enqueueUpload({
                    tempFilePath: '/tmp/test.pdf',
                    originalName: 'test.pdf',
                    mimeType: 'application/pdf',
                    fileSize: 2048,
                    tierId: 'tier-1',
                    title: 'Test',
                    documentId: 'missing',
                    uploadedById: 'u1',
                }),
            ).rejects.toThrow('Document not found');
        });
    });

    // ══════════════════════════════════════════════════
    // revert — Storage Abstraction
    // ══════════════════════════════════════════════════
    describe('revert', () => {
        it('should throw 404 if snapshot not found', async () => {
            (prisma.documentSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.revert('d1', 'bad-snap', 'u1')).rejects.toThrow('Snapshot not found');
        });

        it('should throw 404 if snapshot belongs to different document', async () => {
            (prisma.documentSnapshot.findUnique as jest.Mock).mockResolvedValue({
                id: 'snap1',
                documentId: 'other-doc',
            });

            await expect(service.revert('d1', 'snap1', 'u1')).rejects.toThrow('Snapshot not found');
        });

        it('should copy file via storageService on successful revert', async () => {
            (prisma.documentSnapshot.findUnique as jest.Mock).mockResolvedValue({
                id: 'snap1',
                documentId: 'd1',
                version: 1,
                title: 'Original',
                fileName: 'original.pdf',
                filePath: 'documents/p1/original.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(2048),
                uploadedById: 'u1',
            });
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({
                id: 'd1',
                currentVersion: 3,
                title: 'Current',
                fileName: 'current.pdf',
                filePath: 'documents/p1/current.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(3072),
                uploadedById: 'u2',
            });
            mockStorageService.exists.mockResolvedValue(true);
            (prisma.documentSnapshot.create as jest.Mock).mockResolvedValue({});
            (prisma.document.update as jest.Mock).mockResolvedValue({
                id: 'd1',
                currentVersion: 4,
                fileSize: BigInt(2048),
            });

            await service.revert('d1', 'snap1', 'u1');

            // Should have copied file via storageService
            expect(mockStorageService.copy).toHaveBeenCalledWith(
                'documents/p1/original.pdf',
                expect.stringContaining('documents/p1/revert_'),
            );

            // Should have created snapshot of current state
            expect(prisma.documentSnapshot.create).toHaveBeenCalled();

            // Should have updated the document
            expect(prisma.document.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'd1' },
                    data: expect.objectContaining({
                        currentVersion: 4,
                        changelog: 'Reverted to version 1',
                    }),
                }),
            );
        });

        it('should throw 500 if snapshot file missing in storage', async () => {
            (prisma.documentSnapshot.findUnique as jest.Mock).mockResolvedValue({
                id: 'snap1',
                documentId: 'd1',
                version: 1,
                title: 'T',
                fileName: 'f.pdf',
                filePath: 'documents/p1/f.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(1024),
                uploadedById: 'u1',
            });
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({
                id: 'd1',
                currentVersion: 2,
                title: 'C',
                fileName: 'c.pdf',
                filePath: 'documents/p1/c.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(1024),
                uploadedById: 'u1',
            });
            (prisma.documentSnapshot.create as jest.Mock).mockResolvedValue({});
            mockStorageService.exists.mockResolvedValue(false);

            await expect(service.revert('d1', 'snap1', 'u1')).rejects.toThrow(
                'Original snapshot file missing in storage',
            );
        });
    });

    // ══════════════════════════════════════════════════
    // getFileInfo — Storage Abstraction
    // ══════════════════════════════════════════════════
    describe('getFileInfo', () => {
        it('should return file info when file exists in storage', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: 'documents/p1/test.pdf',
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                currentVersion: 1,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                createdAt: new Date(),
                uploadedById: 'u1',
                changelog: null,
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            mockStorageService.exists.mockResolvedValue(true);

            const result = await service.getFileInfo('d1');
            expect(result.objectKey).toBe('documents/p1/test.pdf');
            expect(result.fileName).toBe('test.pdf');
            expect(mockStorageService.exists).toHaveBeenCalledWith('documents/p1/test.pdf');
        });

        it('should throw 404 when document not found', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.getFileInfo('missing')).rejects.toThrow('Document not found');
        });

        it('should throw 404 when file does not exist in storage', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: 'documents/p1/missing.pdf',
                fileName: 'missing.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                currentVersion: 1,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                createdAt: new Date(),
                uploadedById: null,
                changelog: null,
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            mockStorageService.exists.mockResolvedValue(false);

            await expect(service.getFileInfo('d1')).rejects.toThrow('File not found in storage');
        });
    });

    // ══════════════════════════════════════════════════
    // delete — Storage Abstraction
    // ══════════════════════════════════════════════════
    describe('delete', () => {
        it('should delete file via storageService and document from DB', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: 'documents/p1/test.pdf',
                fileName: 'test.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                currentVersion: 1,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                createdAt: new Date(),
                uploadedById: null,
                changelog: null,
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            (prisma.document.delete as jest.Mock).mockResolvedValue(mockDoc);

            await service.delete('d1');
            expect(mockStorageService.delete).toHaveBeenCalledWith('documents/p1/test.pdf');
            expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
        });

        it('should handle storage deletion errors gracefully', async () => {
            const mockDoc = {
                id: 'd1',
                filePath: 'documents/p1/gone.pdf',
                fileName: 'gone.pdf',
                mimeType: 'application/pdf',
                tierId: 't1',
                title: 'Test',
                fileSize: BigInt(1024),
                currentVersion: 1,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                createdAt: new Date(),
                uploadedById: null,
                changelog: null,
            };

            (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
            mockStorageService.delete.mockRejectedValue(new Error('Not found'));
            (prisma.document.delete as jest.Mock).mockResolvedValue(mockDoc);

            await service.delete('d1');
            expect(mockStorageService.delete).toHaveBeenCalled();
            expect(prisma.document.delete).toHaveBeenCalled();
        });
    });
});
