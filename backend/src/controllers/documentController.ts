import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/documentService';
import { storageService } from '../services/storageService';
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

            const { tierId, title, version } = req.body;
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
                version: version || 'v1.0',
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

    async download(req: Request, res: Response, next: NextFunction) {
        try {
            const { objectKey, fileName, mimeType } = await documentService.getFileInfo(req.params.id);

            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.setHeader('Content-Type', mimeType);

            // Stream the file from storage backend
            const stream = storageService.download(objectKey);
            stream.pipe(res);

            (stream as NodeJS.ReadableStream).on('error', (err: Error) => {
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
