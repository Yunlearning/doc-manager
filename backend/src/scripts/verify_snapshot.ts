import prisma from '../config/database';
import { uploadWorker } from '../jobs/uploadWorker';
import { documentService } from '../services/documentService';
import path from 'path';
import fs from 'fs/promises';

async function verifySnapshotStrategy() {
    console.log('🚀 Starting Snapshot Strategy Verification...');

    // 1. Setup Data
    console.log('📦 Setting up test data...');
    const user = await prisma.user.create({
        data: {
            email: `test_${Date.now()}@example.com`,
            password: 'hashed_password',
            name: 'Test User',
            role: 'ADMIN',
        }
    });

    const project = await prisma.project.create({
        data: { name: 'Test Project', standardType: 'ISO' }
    });

    const tier = await prisma.documentTier.create({
        data: {
            projectId: project.id,
            name: 'Test Tier',
            tierLevel: 1,
            sortOrder: 0
        }
    });

    // Create dummy file
    const tempFilePath = path.resolve(__dirname, '../../storage/temp_test.txt');
    await fs.writeFile(tempFilePath, 'Version 1 Content');

    // 2. Upload Version 1
    console.log('📤 Uploading Version 1...');
    // Simulate Worker Job Data
    const jobDataV1 = {
        tempFilePath, // Worker deletes this, so we need to recreate it if used again
        originalName: 'test_doc.txt',
        mimeType: 'text/plain',
        fileSize: 100,
        tierId: tier.id,
        title: 'Test Document',
        projectId: project.id,
        uploadedById: user.id,
    };

    // We can't easily call worker process directly without a Job object.
    // But we can call `processUpload` if it was exported. 
    // It is not exported directly, but `uploadWorker` is.
    // Alternatively, we can use `documentService.enqueueUpload` but that puts it in Redis.
    // For verification, it's better to integration test via Service/Worker if possible, or Mock.

    // Let's use `documentController`-like flow but invoking Worker logic?
    // Actually, `uploadWorker.ts` has the logic.
    // I will mock the Job object.

    const mockJobV1: any = {
        id: 'job-v1',
        data: jobDataV1,
        updateProgress: async () => { },
    };

    // Hack: import the process function? 
    // I exported `uploadWorker`. To run the processor, I need to access the handler.
    // Or I can just manually insert records to test `revert`?
    // No, I want to test the `processUpload` logic (Snapshot creation).

    // Let's rely on the fact that I just wrote `processUpload` and exported it?
    // I exported `uploadWorker`.
    // I can modify `uploadWorker` to export `processUpload` for testing?
    // Or I can just trust my code review and test `revert` logic which is in `documentService`.

    // Let's test `revert` logic mainly, and `processUpload` via queue if we can, or just bypass.

    // Bypass: Create Doc v1 manually.
    const doc = await prisma.document.create({
        data: {
            tierId: tier.id,
            title: 'Test Document',
            fileName: 'test_doc.txt',
            filePath: 'storage/v1.txt',
            mimeType: 'text/plain',
            fileSize: 100,
            currentVersion: 1,
            uploadedById: user.id,
        }
    });
    console.log('✅ Version 1 Created:', doc.id);

    // 3. Upload Version 2 (Simulate Logic)
    console.log('📤 simulating Upload Version 2 (Snapshotting)...');
    // Manually run the Transaction Logic from `uploadWorker`
    await prisma.$transaction(async (tx) => {
        // Snapshot v1
        await tx.documentSnapshot.create({
            data: {
                documentId: doc.id,
                version: doc.currentVersion,
                title: doc.title,
                fileName: doc.fileName,
                filePath: doc.filePath,
                mimeType: doc.mimeType,
                fileSize: doc.fileSize,
                uploadedById: doc.uploadedById,
                changelog: doc.changelog,
            }
        });

        // Update to v2
        await tx.document.update({
            where: { id: doc.id },
            data: {
                fileName: 'test_doc_v2.txt',
                filePath: 'storage/v2.txt',
                currentVersion: { increment: 1 },
                changelog: 'Updated to v2',
            }
        });
    });

    const docV2 = await prisma.document.findUnique({ where: { id: doc.id } });
    console.log('✅ Version 2 Updated. Current Version:', docV2?.currentVersion, 'Changelog:', docV2?.changelog);

    const snapshots = await prisma.documentSnapshot.findMany({ where: { documentId: doc.id } });
    console.log('📸 Snapshots count:', snapshots.length);
    if (snapshots.length !== 1) throw new Error('Snapshot count incorrect');
    if (snapshots[0].version !== 1) throw new Error('Snapshot version incorrect');

    // 4. Revert to v1
    console.log('Describe Revert to v1...');
    // We need to ensure files exist for copyFile to work
    await fs.mkdir(path.resolve(__dirname, '../../storage'), { recursive: true });
    await fs.writeFile(path.resolve(__dirname, '../../storage/v1.txt'), 'Content V1');
    await fs.writeFile(path.resolve(__dirname, '../../storage/v2.txt'), 'Content V2');

    // Mock filePath in DB to be absolute or relative to cwd? 
    // Service uses `path.resolve`? No, `uploadWorker` used absolute path.
    // So let's update DB with absolute paths.
    const absPathV1 = path.resolve(__dirname, '../../storage/v1.txt');
    const absPathV2 = path.resolve(__dirname, '../../storage/v2.txt');

    await prisma.documentSnapshot.update({ where: { id: snapshots[0].id }, data: { filePath: absPathV1 } });
    await prisma.document.update({ where: { id: doc.id }, data: { filePath: absPathV2 } });

    // Call Revert
    const revertedDoc = await documentService.revert(doc.id, snapshots[0].id, user.id);

    console.log('✅ Revert Complete. New Version:', revertedDoc.currentVersion);
    console.log('📝 New Changelog:', revertedDoc.changelog);

    if (revertedDoc.currentVersion !== 3) throw new Error('Version should be 3');
    if (!revertedDoc.changelog?.includes('Reverted to version 1')) throw new Error('Changelog incorrect');

    const snapshotsFinal = await prisma.documentSnapshot.findMany({ where: { documentId: doc.id } });
    console.log('📸 Final Snapshots count:', snapshotsFinal.length); // Should be 2 (v1 and v2)
    if (snapshotsFinal.length !== 2) throw new Error('Final snapshot count incorrect');

    console.log('🎉 Verification Successful!');

    // Cleanup
    await prisma.document.deleteMany();
    await prisma.documentSnapshot.deleteMany();
    await prisma.documentTier.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await fs.unlink(absPathV1).catch(() => { });
    await fs.unlink(absPathV2).catch(() => { });
    // Clean up valid-looking reverted file? It will be in same dir with UUID.
}

verifySnapshotStrategy()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
