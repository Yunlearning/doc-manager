import { DocumentService } from '../src/services/documentService';
import prisma from '../src/config/database';

// ── Mock Prisma ──────────────────────────────────────
jest.mock('../src/config/database', () => ({
    __esModule: true,
    default: {
        document: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findUniqueOrThrow: jest.fn(),
            delete: jest.fn(),
        },
        documentVersion: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        documentTier: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn(),
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

import { storageService } from '../src/services/storageService';
const mockStorageService = storageService as jest.Mocked<typeof storageService>;

import { uploadQueue } from '../src/queues/uploadQueue';

describe('DocumentService', () => {
    let service: DocumentService;

    beforeEach(() => {
        service = new DocumentService();
        jest.clearAllMocks();
        // Reset default mock behavior
        mockStorageService.exists.mockResolvedValue(true);
    });

    // ══════════════════════════════════════════════════
    // findByTier — Version Table
    // ══════════════════════════════════════════════════
    describe('findByTier', () => {
        it('should return documents with flattened latest version data', async () => {
            const mockDocs = [
                {
                    id: 'd1',
                    title: 'Quality Manual',
                    currentVersion: 2,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    uploadedById: 'u1',
                    versions: [
                        {
                            fileName: 'manual_v2.pdf',
                            mimeType: 'application/pdf',
                            fileSize: BigInt(4096),
                            createdAt: new Date(),
                            uploadedBy: { id: 'u1', name: 'Admin', email: 'admin@test.com' },
                        },
                    ],
                },
            ];

            (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocs);

            const result = await service.findByTier('tier-1');
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Quality Manual');
            expect(result[0].currentVersion).toBe(2);
            expect(result[0].fileName).toBe('manual_v2.pdf');
        });

        it('should handle documents with no versions', async () => {
            const mockDocs = [
                {
                    id: 'd1',
                    title: 'Empty Doc',
                    currentVersion: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    uploadedById: null,
                    versions: [],
                },
            ];

            (prisma.document.findMany as jest.Mock).mockResolvedValue(mockDocs);

            const result = await service.findByTier('tier-1');
            expect(result).toHaveLength(1);
            expect(result[0].fileName).toBe('');
        });
    });

    // ══════════════════════════════════════════════════
    // enqueueUpload — Version Table
    // ══════════════════════════════════════════════════
    describe('enqueueUpload', () => {
        it('should enqueue a first-time upload', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue({ projectId: 'p1' });

            const result = await service.enqueueUpload({
                tempFilePath: '/tmp/test.pdf',
                originalName: 'test.pdf',
                mimeType: 'application/pdf',
                fileSize: 2048,
                tierId: 'tier-1',
                title: 'Test Upload',
            });

            expect(result.jobId).toBe('job-1');
            expect(uploadQueue.add).toHaveBeenCalledWith(
                'upload',
                expect.objectContaining({
                    tierId: 'tier-1',
                    title: 'Test Upload',
                    projectId: 'p1',
                }),
            );
        });

        it('should enqueue a new version upload with documentId + changelog', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue({ projectId: 'p1' });
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'd1' });

            const result = await service.enqueueUpload({
                tempFilePath: '/tmp/v2.pdf',
                originalName: 'v2.pdf',
                mimeType: 'application/pdf',
                fileSize: 3072,
                tierId: 'tier-1',
                title: 'Updated Doc',
                documentId: 'd1',
                changelog: 'Fixed typo',
                userId: 'u1',
            });

            expect(result.jobId).toBe('job-1');
            expect(uploadQueue.add).toHaveBeenCalledWith(
                'upload',
                expect.objectContaining({
                    documentId: 'd1',
                    changelog: 'Fixed typo',
                    userId: 'u1',
                }),
            );
        });

        it('should throw 404 when tier does not exist', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.enqueueUpload({
                    tempFilePath: '/tmp/t.pdf',
                    originalName: 't.pdf',
                    mimeType: 'application/pdf',
                    fileSize: 1024,
                    tierId: 'invalid',
                    title: 'Test',
                }),
            ).rejects.toThrow('Tier not found');
        });

        it('should throw 404 when documentId points to non-existent document', async () => {
            (prisma.documentTier.findUnique as jest.Mock).mockResolvedValue({ projectId: 'p1' });
            (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(
                service.enqueueUpload({
                    tempFilePath: '/tmp/t.pdf',
                    originalName: 't.pdf',
                    mimeType: 'application/pdf',
                    fileSize: 1024,
                    tierId: 'tier-1',
                    title: 'Test',
                    documentId: 'missing',
                }),
            ).rejects.toThrow('Document not found');
        });
    });

    // ══════════════════════════════════════════════════
    // getHistory
    // ══════════════════════════════════════════════════
    describe('getHistory', () => {
        it('should return version history ordered by versionNumber desc', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: 'd1' });

            const versions = [
                { id: 'v2', documentId: 'd1', versionNumber: 2, title: 'Doc v2', fileName: 'v2.pdf', fileSize: BigInt(3000), changelog: 'Update', createdAt: new Date(), uploadedBy: null },
                { id: 'v1', documentId: 'd1', versionNumber: 1, title: 'Doc v1', fileName: 'v1.pdf', fileSize: BigInt(2000), changelog: null, createdAt: new Date(), uploadedBy: null },
            ];
            (prisma.documentVersion.findMany as jest.Mock).mockResolvedValue(versions);

            const result = await service.getHistory('d1');
            expect(result).toHaveLength(2);
            expect(result[0].versionNumber).toBe(2);
        });

        it('should throw 404 if document does not exist', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.getHistory('missing')).rejects.toThrow('Document not found');
        });
    });

    // ══════════════════════════════════════════════════
    // revert
    // ══════════════════════════════════════════════════
    describe('revert', () => {
        it('should throw 404 if version not found', async () => {
            (prisma.documentVersion.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.revert('d1', 'bad-v', 'u1')).rejects.toThrow(
                'Version not found',
            );
        });

        it('should throw 404 if version belongs to different document', async () => {
            (prisma.documentVersion.findUnique as jest.Mock).mockResolvedValue({
                id: 'v1',
                documentId: 'other-doc',
                versionNumber: 1,
                title: 'T',
                fileName: 'f.pdf',
                filePath: 'documents/p1/f.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(1024),
            });

            await expect(service.revert('d1', 'v1', 'u1')).rejects.toThrow(
                'Version not found',
            );
        });

        it('should copy file via storageService and create new version on successful revert', async () => {
            const targetVersion = {
                id: 'v1',
                documentId: 'd1',
                versionNumber: 1,
                title: 'Original',
                fileName: 'original.pdf',
                filePath: 'documents/p1/original.pdf',
                mimeType: 'application/pdf',
                fileSize: BigInt(2048),
            };
            (prisma.documentVersion.findUnique as jest.Mock).mockResolvedValue(targetVersion);
            (prisma.document.findUniqueOrThrow as jest.Mock).mockResolvedValue({
                id: 'd1',
                currentVersion: 3,
            });

            const txMock = {
                documentVersion: { create: jest.fn().mockResolvedValue({}) },
                document: {
                    update: jest.fn().mockResolvedValue({
                        id: 'd1',
                        currentVersion: 4,
                        versions: [{ fileName: 'original.pdf' }],
                    }),
                },
            };
            (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

            const result = await service.revert('d1', 'v1', 'u1');

            // File should have been copied via storageService
            expect(mockStorageService.copy).toHaveBeenCalledWith(
                'documents/p1/original.pdf',
                'documents/p1/revert-v4-original.pdf',
            );

            // New version should be created with incremented version number
            expect(txMock.documentVersion.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        documentId: 'd1',
                        versionNumber: 4,
                        changelog: 'Reverted to version 1',
                    }),
                }),
            );

            // Document pointer should be updated
            expect(txMock.document.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'd1' },
                    data: expect.objectContaining({ currentVersion: 4 }),
                }),
            );
        });
    });

    // ══════════════════════════════════════════════════
    // getFileInfo — Storage Abstraction
    // ══════════════════════════════════════════════════
    describe('getFileInfo', () => {
        it('should return file info from latest version', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({
                id: 'd1',
                versions: [
                    {
                        filePath: 'documents/p1/test.pdf',
                        fileName: 'test.pdf',
                        mimeType: 'application/pdf',
                    },
                ],
            });
            mockStorageService.exists.mockResolvedValue(true);

            const result = await service.getFileInfo('d1');
            expect(result.objectKey).toBe('documents/p1/test.pdf');
            expect(result.fileName).toBe('test.pdf');
        });

        it('should throw 404 when document not found', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(service.getFileInfo('missing')).rejects.toThrow('Document not found');
        });

        it('should throw 404 when no versions exist', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({
                id: 'd1',
                versions: [],
            });

            await expect(service.getFileInfo('d1')).rejects.toThrow('No version found');
        });

        it('should throw 404 when file does not exist in storage', async () => {
            (prisma.document.findUnique as jest.Mock).mockResolvedValue({
                id: 'd1',
                versions: [{ filePath: 'documents/p1/missing.pdf', fileName: 'missing.pdf', mimeType: 'application/pdf' }],
            });
            mockStorageService.exists.mockResolvedValue(false);

            await expect(service.getFileInfo('d1')).rejects.toThrow('File not found in storage');
        });
    });

    // ══════════════════════════════════════════════════
    // delete — Storage Abstraction
    // ══════════════════════════════════════════════════
    describe('delete', () => {
        it('should delete all version files via storageService and the document', async () => {
            const versions = [
                { filePath: 'documents/p1/v1.pdf' },
                { filePath: 'documents/p1/v2.pdf' },
            ];
            (prisma.documentVersion.findMany as jest.Mock).mockResolvedValue(versions);
            (prisma.document.delete as jest.Mock).mockResolvedValue({ id: 'd1' });

            await service.delete('d1');

            expect(mockStorageService.delete).toHaveBeenCalledWith('documents/p1/v1.pdf');
            expect(mockStorageService.delete).toHaveBeenCalledWith('documents/p1/v2.pdf');
            expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
        });

        it('should handle storage deletion errors gracefully', async () => {
            (prisma.documentVersion.findMany as jest.Mock).mockResolvedValue([
                { filePath: 'documents/p1/gone.pdf' },
            ]);
            mockStorageService.delete.mockRejectedValue(new Error('Not found'));
            (prisma.document.delete as jest.Mock).mockResolvedValue({ id: 'd1' });

            await service.delete('d1');

            expect(mockStorageService.delete).toHaveBeenCalled();
            expect(prisma.document.delete).toHaveBeenCalled();
        });
    });
});
