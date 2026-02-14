import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/documentService';
import fs from 'fs';

export class DocumentController {
    async findByTier(req: Request, res: Response, next: NextFunction) {
        try {
            const { tierId } = req.query;
            if (!tierId || typeof tierId !== 'string') {
                res.status(400).json({ success: false, message: 'tierId query param is required' });
                return;
            }
            const documents = await documentService.findByTier(tierId);
            // Serialize BigInt to string
            const serialized = documents.map((doc) => ({
                ...doc,
                fileSize: doc.fileSize.toString(),
            }));
            res.json({ success: true, data: serialized });
        } catch (error) {
            next(error);
        }
    }

    async upload(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file provided' });
                return;
            }

            const { tierId, title, documentId, changelog } = req.body;
            if (!tierId || !title) {
                // Clean up temp file
                fs.unlinkSync(req.file.path);
                res.status(400).json({ success: false, message: 'tierId and title are required' });
                return;
            }

            const result = await documentService.enqueueUpload({
                tempFilePath: req.file.path,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                tierId,
                title,
                documentId, // Optional: for uploading new version
                changelog,
                uploadedById: req.user.id, // Track uploader
            });

            res.status(202).json({
                success: true,
                message: 'Upload queued',
                data: result,
            });
        } catch (error) {
            // Clean up temp file on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            next(error);
        }
    }

    async getJobStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const status = await documentService.getJobStatus(req.params.jobId);
            res.json({ success: true, data: status });
        } catch (error) {
            next(error);
        }
    }

    async getHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const history = await documentService.getHistory(id);
            // Serialize BigInt
            const serialized = history.map((snap: any) => ({
                ...snap,
                fileSize: snap.fileSize.toString(),
            }));
            res.json({ success: true, data: serialized });
        } catch (error) {
            next(error);
        }
    }

    async revert(req: Request, res: Response, next: NextFunction) {
        try {
            const { snapshotId } = req.body;
            const id = req.params.id as string;

            if (!snapshotId) {
                res.status(400).json({ success: false, message: 'snapshotId is required' });
                return;
            }

            const result = await documentService.revert(id, snapshotId, req.user!.id);
            res.json({ success: true, data: { ...result, fileSize: result.fileSize.toString() } });
        } catch (error) {
            next(error);
        }
    }

    async download(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const { filePath, fileName, mimeType } = await documentService.getFilePath(id);

            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', mimeType);

            // Stream the file (non-blocking)
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);

            stream.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, message: 'Error streaming file' });
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await documentService.delete(req.params.id);
            res.json({ success: true, message: 'Document deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export const documentController = new DocumentController();
